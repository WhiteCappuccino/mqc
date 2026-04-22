import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import axios from "axios";
import { createHash, randomUUID } from "crypto";
import { basename } from "path";
import {
  AccessLevel,
  CheckStatus,
  MediaStatus,
  MediaType,
  Prisma,
  Role,
  ViolationSeverity,
  ViolationSource,
} from "@prisma/client";
import { JwtPayload } from "../auth/jwt-payload.interface";
import { AuditService } from "../audit/audit.service";
import {
  AnalyzeResponse,
  AnalyzerClientService,
} from "../analyzer/analyzer-client.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { ListMediaQueryDto } from "./dto/list-media-query.dto";
import { UpdateMediaVersionDto } from "./dto/update-media-version.dto";
import { UploadMediaDto } from "./dto/upload-media.dto";

const SUPPORTED_EXTENSIONS: Record<MediaType, string[]> = {
  IMAGE: ["jpg", "jpeg", "png", "webp"],
  VIDEO: ["mp4", "mov", "avi"],
  AUDIO: ["mp3", "wav"],
  TEXT: ["txt", "docx", "pdf"],
  MIXED: ["zip"],
};

const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;

interface ResolvedSource {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly analyzerClient: AnalyzerClientService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async upload(
    dto: UploadMediaDto,
    file: Express.Multer.File | undefined,
    user: JwtPayload,
  ) {
    const source = await this.resolveUploadSource(dto, file);
    const inferredType = dto.type ?? MediaService.inferMediaType(source.mimeType);
    this.assertFileFormatAllowed(source.fileName, inferredType);

    const key = `${user.sub}/${randomUUID()}-${source.fileName}`;
    await this.storageService.uploadObject({
      key,
      body: source.buffer,
      mimeType: source.mimeType,
    });

    const categoryId = await this.resolveCategoryId(dto.category);
    const tagRecords = await this.resolveTags(dto.tags);
    const checksum = createHash("sha256").update(source.buffer).digest("hex");

    const media = await this.prisma.mediaItem.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: inferredType,
        ownerId: user.sub,
        status: MediaStatus.UPLOADED,
        fileName: source.fileName,
        mimeType: source.mimeType,
        sizeBytes: source.sizeBytes,
        storageKey: key,
        checksum,
        previewUrl: this.storageService.getPublicUrl(key),
        categoryId,
        tags: {
          create: tagRecords.map((tag) => ({ tagId: tag.id })),
        },
      },
      include: {
        tags: { include: { tag: true } },
        category: true,
      },
    });

    await this.auditService.log({
      actorId: user.sub,
      action: "UPLOAD_MEDIA",
      entityType: "MEDIA",
      entityId: media.id,
      metadata: { title: media.title, type: media.type, checksum },
    });

    return media;
  }

  async uploadNewVersion(
    mediaId: string,
    dto: UpdateMediaVersionDto,
    file: Express.Multer.File | undefined,
    user: JwtPayload,
  ) {
    const media = await this.prisma.mediaItem.findUnique({
      where: { id: mediaId },
      include: {
        tags: { include: { tag: true } },
        category: true,
      },
    });
    if (!media) throw new NotFoundException("Media not found");
    await this.assertCanEditMedia(media.id, user);

    const source = await this.resolveUploadSource(dto, file);
    const inferredType = dto.type ?? MediaService.inferMediaType(source.mimeType);
    this.assertFileFormatAllowed(source.fileName, inferredType);
    const checksum = createHash("sha256").update(source.buffer).digest("hex");

    const key = `${media.ownerId}/${randomUUID()}-${source.fileName}`;
    await this.storageService.uploadObject({
      key,
      body: source.buffer,
      mimeType: source.mimeType,
    });

    const categoryId = dto.category
      ? await this.resolveCategoryId(dto.category)
      : media.categoryId;

    const tagRecords = dto.tags ? await this.resolveTags(dto.tags) : null;

    const updatedMedia = await this.prisma.$transaction(async (transaction) => {
      await transaction.mediaRevision.create({
        data: {
          mediaItemId: media.id,
          version: media.version,
          title: media.title,
          description: media.description,
          storageKey: media.storageKey,
          checksum: media.checksum,
          fileName: media.fileName,
          mimeType: media.mimeType,
          sizeBytes: media.sizeBytes,
          type: media.type,
          status: media.status,
          previewUrl: media.previewUrl,
          categoryName: media.category?.name ?? null,
          tags: media.tags.map((entry) => entry.tag.name) as Prisma.InputJsonValue,
          createdById: user.sub,
        },
      });

      return transaction.mediaItem.update({
        where: { id: media.id },
        data: {
          title: dto.title ?? media.title,
          description: dto.description ?? media.description,
          type: inferredType,
          fileName: source.fileName,
          mimeType: source.mimeType,
          sizeBytes: source.sizeBytes,
          storageKey: key,
          checksum,
          previewUrl: this.storageService.getPublicUrl(key),
          categoryId,
          status: MediaStatus.UPLOADED,
          version: { increment: 1 },
          tags: tagRecords ? {
            deleteMany: {},
            create: tagRecords.map((tag) => ({ tagId: tag.id })),
          } : undefined,
        },
        include: {
          tags: { include: { tag: true } },
          category: true,
        },
      });
    });

    await this.auditService.log({
      actorId: user.sub,
      action: "UPLOAD_MEDIA_VERSION",
      entityType: "MEDIA",
      entityId: media.id,
      metadata: {
        previousVersion: media.version,
        nextVersion: updatedMedia.version,
        checksum,
      },
    });

    return updatedMedia;
  }

  async list(user: JwtPayload, query: ListMediaQueryDto) {
    const where: Prisma.MediaItemWhereInput = this.buildListWhere(user, query);
    const orderBy = this.buildOrderBy(query.sortBy);

    const media = await this.prisma.mediaItem.findMany({
      where,
      orderBy,
      include: {
        owner: { select: { id: true, fullName: true, username: true } },
        category: true,
        tags: { include: { tag: true } },
        qualityChecks: { take: 1, orderBy: { createdAt: "desc" } },
        decisions: { take: 1, orderBy: { createdAt: "desc" } },
        _count: { select: { favorites: true } },
      },
    });

    if (query.sortBy === "quality") {
      return media.sort(
        (a, b) => (b.qualityChecks[0]?.finalScore ?? 0) - (a.qualityChecks[0]?.finalScore ?? 0),
      );
    }
    if (query.sortBy === "popularity") {
      return media.sort((a, b) => b._count.favorites - a._count.favorites);
    }
    return media;
  }

  async getById(id: string, user: JwtPayload) {
    const media = await this.prisma.mediaItem.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, fullName: true, username: true } },
        category: true,
        tags: { include: { tag: true } },
        qualityChecks: {
          orderBy: { createdAt: "desc" },
          include: { violations: true },
        },
        violations: { orderBy: { createdAt: "desc" } },
        decisions: { orderBy: { createdAt: "desc" } },
        comments: {
          include: {
            author: { select: { id: true, fullName: true, username: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        access: {
          include: {
            user: { select: { id: true, fullName: true, username: true, email: true } },
          },
        },
        revisions: {
          orderBy: { version: "desc" },
          take: 20,
        },
      },
    });

    if (!media) {
      throw new NotFoundException("Media not found");
    }
    await this.assertCanReadMedia(media.id, user);

    return {
      ...media,
      publicUrl: this.storageService.getPublicUrl(media.storageKey),
    };
  }

  async sendToAutomaticCheck(id: string, user: JwtPayload) {
    const media = await this.prisma.mediaItem.findUnique({ where: { id } });
    if (!media) throw new NotFoundException("Media not found");
    await this.assertCanEditMedia(media.id, user);

    const criteria = await this.prisma.qualityCriterion.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });

    await this.prisma.mediaItem.update({
      where: { id },
      data: { status: MediaStatus.IN_PROCESS },
    });

    const duplicateCount = await this.prisma.mediaItem.count({
      where: {
        checksum: media.checksum,
        id: { not: media.id },
      },
    });

    const result = await this.analyzerClient.analyze({
      mediaType: media.type,
      title: media.title,
      description: media.description ?? undefined,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      fileName: media.fileName,
      fileUrl: this.storageService.getPublicUrl(media.storageKey),
      duplicateHint: duplicateCount > 0,
    });

    const finalStatus = this.mapRecommendationToStatus(result);
    const qualityCheck = await this.prisma.qualityCheck.create({
      data: {
        mediaItemId: media.id,
        initiatedById: user.sub,
        status: CheckStatus.COMPLETED,
        mediaVersion: media.version,
        criteria: criteria.map((criterion) => ({
          code: criterion.code,
          name: criterion.name,
          weight: criterion.weight,
        })) as Prisma.InputJsonValue,
        autoResult: result.details as Prisma.InputJsonValue,
        autoScore: result.score,
        finalScore: result.score,
        finishedAt: new Date(),
      },
    });

    await this.persistViolations(media.id, media.version, qualityCheck.id, result.violations);

    const updatedMedia = await this.prisma.mediaItem.update({
      where: { id: media.id },
      data: { status: finalStatus },
    });

    await this.notificationsService.notify({
      userId: media.ownerId,
      type: "AUTO_CHECK_FINISHED",
      title: "Automatic check finished",
      message: `Automatic check for "${media.title}" is completed. Score: ${result.score}.`,
      alsoEmail: true,
    });

    await this.notificationsService.notifyMaterialOwnerStatusChanged(
      media.ownerId,
      media.title,
      updatedMedia.status,
    );

    if (finalStatus === MediaStatus.NEEDS_MANUAL_MODERATION) {
      await this.notificationsService.notifyModeratorsAboutNewCheck(media.id, media.title);
    }

    await this.auditService.log({
      actorId: user.sub,
      action: "RUN_AUTO_CHECK",
      entityType: "MEDIA",
      entityId: media.id,
      metadata: {
        score: result.score,
        violations: result.violations,
        status: updatedMedia.status,
        duplicateHint: duplicateCount > 0,
      },
    });

    return {
      media: updatedMedia,
      qualityCheck,
    };
  }

  async grantAccess(
    mediaId: string,
    owner: JwtPayload,
    payload: { email: string; level: AccessLevel },
  ) {
    const media = await this.prisma.mediaItem.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException("Media not found");
    if (media.ownerId !== owner.sub && owner.role !== Role.ADMIN) {
      throw new ForbiddenException("Only owner can manage access");
    }

    const user = await this.prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const access = await this.prisma.mediaAccess.upsert({
      where: {
        mediaItemId_userId: {
          mediaItemId: mediaId,
          userId: user.id,
        },
      },
      update: { level: payload.level },
      create: {
        mediaItemId: mediaId,
        userId: user.id,
        level: payload.level,
      },
    });

    await this.notificationsService.notify({
      userId: user.id,
      type: "COLLAB_INVITE",
      title: "Shared media access",
      message: `You were granted ${payload.level} access to "${media.title}"`,
      alsoEmail: user.notificationEmail,
    });

    await this.auditService.log({
      actorId: owner.sub,
      action: "GRANT_MEDIA_ACCESS",
      entityType: "MEDIA",
      entityId: media.id,
      metadata: { invitedUserId: user.id, level: payload.level },
    });

    return access;
  }

  async revokeAccess(mediaId: string, owner: JwtPayload, userId: string) {
    const media = await this.prisma.mediaItem.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException("Media not found");
    if (media.ownerId !== owner.sub && owner.role !== Role.ADMIN) {
      throw new ForbiddenException("Only owner can manage access");
    }

    await this.prisma.mediaAccess.deleteMany({
      where: {
        mediaItemId: mediaId,
        userId,
      },
    });

    await this.auditService.log({
      actorId: owner.sub,
      action: "REVOKE_MEDIA_ACCESS",
      entityType: "MEDIA",
      entityId: media.id,
      metadata: { removedUserId: userId },
    });
    return { ok: true };
  }

  async listAuditLogs(mediaId: string, user: JwtPayload) {
    await this.assertCanReadMedia(mediaId, user);

    return this.prisma.auditLog.findMany({
      where: {
        entityType: "MEDIA",
        entityId: mediaId,
      },
      include: {
        actor: {
          select: { id: true, email: true, username: true, fullName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
  }

  private async resolveUploadSource(
    dto: { fileUrl?: string },
    file: Express.Multer.File | undefined,
  ): Promise<ResolvedSource> {
    if (file) {
      return {
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        buffer: file.buffer,
      };
    }
    if (!dto.fileUrl) {
      throw new BadRequestException("Either file or fileUrl is required");
    }

    let response;
    try {
      response = await axios.get<ArrayBuffer>(dto.fileUrl, {
        responseType: "arraybuffer",
        timeout: 20000,
        maxBodyLength: MAX_UPLOAD_SIZE,
        maxContentLength: MAX_UPLOAD_SIZE,
      });
    } catch {
      throw new BadRequestException("Could not download file from provided URL");
    }
    const mimeType = response.headers["content-type"]?.split(";")[0]?.trim() || "application/octet-stream";
    const urlPath = new URL(dto.fileUrl).pathname;
    const decoded = decodeURIComponent(urlPath);
    const candidate = basename(decoded);
    const fileName = candidate || `remote-${randomUUID()}`;
    const buffer = Buffer.from(response.data);
    if (!buffer.length) {
      throw new BadRequestException("Downloaded file is empty");
    }

    return {
      fileName,
      mimeType,
      sizeBytes: buffer.length,
      buffer,
    };
  }

  private async resolveCategoryId(category?: string | null) {
    if (!category?.trim()) return null;
    const entity = await this.prisma.category.upsert({
      where: { name: category.trim() },
      update: {},
      create: { name: category.trim() },
    });
    return entity.id;
  }

  private async resolveTags(tags?: string[] | null) {
    if (!tags?.length) return [];
    return Promise.all(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .map((tag) =>
          this.prisma.tag.upsert({
            where: { name: tag },
            update: {},
            create: { name: tag },
          }),
        ),
    );
  }

  private assertFileFormatAllowed(fileName: string, type: MediaType) {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const allowed = SUPPORTED_EXTENSIONS[type] ?? [];
    if (!allowed.includes(ext)) {
      throw new BadRequestException(`File extension .${ext} is not allowed for ${type}`);
    }
  }

  private buildListWhere(user: JwtPayload, query: ListMediaQueryDto): Prisma.MediaItemWhereInput {
    const where: Prisma.MediaItemWhereInput = {};

    if (user.role === Role.USER) {
      where.OR = [{ ownerId: user.sub }, { access: { some: { userId: user.sub } } }];
    }

    if (query.q) {
      const andConditions = Array.isArray(where.AND)
        ? where.AND
        : where.AND
          ? [where.AND]
          : [];
      where.AND = [
        ...andConditions,
        {
          OR: [
            { title: { contains: query.q, mode: "insensitive" } },
            { owner: { fullName: { contains: query.q, mode: "insensitive" } } },
            { tags: { some: { tag: { name: { contains: query.q, mode: "insensitive" } } } } },
          ],
        },
      ];
    }
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.authorId) where.ownerId = query.authorId;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
        lte: query.dateTo ? new Date(query.dateTo) : undefined,
      };
    }
    if (query.severity) {
      where.violations = {
        some: { severity: query.severity },
      };
    }

    return where;
  }

  private buildOrderBy(sortBy?: string): Prisma.MediaItemOrderByWithRelationInput {
    if (sortBy === "status") {
      return { status: "asc" };
    }
    return { createdAt: "desc" };
  }

  private mapRecommendationToStatus(result: AnalyzeResponse): MediaStatus {
    if (result.recommendation === "approved") return MediaStatus.AUTO_CHECKED;
    if (result.recommendation === "manual_review") return MediaStatus.NEEDS_MANUAL_MODERATION;
    return MediaStatus.ON_REVISION;
  }

  private async persistViolations(
    mediaId: string,
    mediaVersion: number,
    qualityCheckId: string,
    violationCodes: string[],
  ) {
    const dedupedCodes = [...new Set(violationCodes.map((code) => code.trim()).filter(Boolean))];
    for (const code of dedupedCodes) {
      const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
      const dictionary = await this.prisma.violationDictionary.findUnique({
        where: { code: normalizedCode },
      });
      await this.prisma.violation.create({
        data: {
          mediaItemId: mediaId,
          qualityCheckId,
          dictionaryId: dictionary?.id,
          type: normalizedCode,
          description: dictionary?.description ?? `Auto detected: ${normalizedCode}`,
          severity: dictionary?.defaultSeverity ?? ViolationSeverity.MEDIUM,
          mediaVersion,
          source: ViolationSource.SYSTEM,
        },
      });
    }
  }

  private async assertCanReadMedia(mediaId: string, user: JwtPayload) {
    if (user.role === Role.ADMIN || user.role === Role.MODERATOR) return;

    const media = await this.prisma.mediaItem.findUnique({
      where: { id: mediaId },
      include: { access: true },
    });
    if (!media) throw new NotFoundException("Media not found");

    const hasAccess = media.ownerId === user.sub || media.access.some((access) => access.userId === user.sub);
    if (!hasAccess) {
      throw new ForbiddenException("Access denied");
    }
  }

  private async assertCanEditMedia(mediaId: string, user: JwtPayload) {
    if (user.role === Role.ADMIN || user.role === Role.MODERATOR) return;

    const media = await this.prisma.mediaItem.findUnique({
      where: { id: mediaId },
      include: { access: true },
    });
    if (!media) throw new NotFoundException("Media not found");
    if (media.ownerId === user.sub) return;

    const access = media.access.find((a) => a.userId === user.sub);
    if (!access || access.level === AccessLevel.VIEW || access.level === AccessLevel.COMMENT) {
      throw new ForbiddenException("Edit access denied");
    }
  }

  static inferMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith("image/")) return MediaType.IMAGE;
    if (mimeType.startsWith("video/")) return MediaType.VIDEO;
    if (mimeType.startsWith("audio/")) return MediaType.AUDIO;
    if (mimeType.startsWith("text/")) return MediaType.TEXT;
    return MediaType.MIXED;
  }
}

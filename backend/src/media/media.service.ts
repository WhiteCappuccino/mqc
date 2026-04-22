import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
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
import { randomUUID } from "crypto";
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
import { UploadMediaDto } from "./dto/upload-media.dto";

const SUPPORTED_EXTENSIONS: Record<MediaType, string[]> = {
  IMAGE: ["jpg", "jpeg", "png", "webp"],
  VIDEO: ["mp4", "mov", "avi"],
  AUDIO: ["mp3", "wav"],
  TEXT: ["txt", "docx", "pdf"],
  MIXED: ["zip"],
};

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly analyzerClient: AnalyzerClientService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async upload(dto: UploadMediaDto, file: Express.Multer.File, user: JwtPayload) {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    const inferredType = dto.type ?? MediaService.inferMediaType(file.mimetype);
    this.assertFileFormatAllowed(file.originalname, inferredType);

    const key = `${user.sub}/${randomUUID()}-${file.originalname}`;
    await this.storageService.uploadObject({
      key,
      body: file.buffer,
      mimeType: file.mimetype,
    });

    const category = dto.category
      ? await this.prisma.category.upsert({
          where: { name: dto.category.trim() },
          update: {},
          create: { name: dto.category.trim() },
        })
      : null;

    const tagRecords = dto.tags?.length
      ? await Promise.all(
          dto.tags.map((tag) =>
            this.prisma.tag.upsert({
              where: { name: tag.trim().toLowerCase() },
              update: {},
              create: { name: tag.trim().toLowerCase() },
            }),
          ),
        )
      : [];

    const media = await this.prisma.mediaItem.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: inferredType,
        ownerId: user.sub,
        status: MediaStatus.UPLOADED,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey: key,
        previewUrl: this.storageService.getPublicUrl(key),
        categoryId: category?.id,
        tags: {
          create: tagRecords.map((tag) => ({
            tagId: tag.id,
          })),
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
      metadata: { title: media.title, type: media.type },
    });

    return media;
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
      return media.sort((a, b) => (b.qualityChecks[0]?.finalScore ?? 0) - (a.qualityChecks[0]?.finalScore ?? 0));
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

    const result = await this.analyzerClient.analyze({
      mediaType: media.type,
      title: media.title,
      description: media.description ?? undefined,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
    });

    const finalStatus = this.mapRecommendationToStatus(result);
    const qualityCheck = await this.prisma.qualityCheck.create({
      data: {
        mediaItemId: media.id,
        initiatedById: user.sub,
        status: CheckStatus.COMPLETED,
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

    await this.persistViolations(media.id, qualityCheck.id, result.violations);

    const updatedMedia = await this.prisma.mediaItem.update({
      where: { id: media.id },
      data: { status: finalStatus },
    });

    await this.notificationsService.notifyMaterialOwnerStatusChanged(
      media.ownerId,
      media.title,
      updatedMedia.status,
    );

    if (finalStatus === MediaStatus.NEEDS_MANUAL_MODERATION) {
      await this.notificationsService.notifyModeratorsAboutNewCheck(
        media.id,
        media.title,
      );
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
      where.OR = [
        { ownerId: user.sub },
        { access: { some: { userId: user.sub } } },
      ];
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
    qualityCheckId: string,
    violationCodes: string[],
  ) {
    for (const code of violationCodes) {
      const dictionary = await this.prisma.violationDictionary.findUnique({
        where: { code: code.toUpperCase() },
      });
      await this.prisma.violation.create({
        data: {
          mediaItemId: mediaId,
          qualityCheckId,
          dictionaryId: dictionary?.id,
          type: code,
          description: `Auto detected: ${code}`,
          severity: dictionary?.defaultSeverity ?? ViolationSeverity.MEDIUM,
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

    const hasAccess =
      media.ownerId === user.sub ||
      media.access.some((access) => access.userId === user.sub);
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
    if (
      !access ||
      access.level === AccessLevel.VIEW ||
      access.level === AccessLevel.COMMENT
    ) {
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

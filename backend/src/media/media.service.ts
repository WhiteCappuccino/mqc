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
  QualityRuleKind,
  Role,
  TaxonomyKind,
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
import {
  ANALYZER_VIOLATION_PENALTIES,
  ANALYZER_VIOLATION_TO_CRITERIA,
} from "../quality/analyzer-rule-maps";
import { StorageService } from "../storage/storage.service";
import { ListMediaQueryDto } from "./dto/list-media-query.dto";
import { SendForCheckDto } from "./dto/send-for-check.dto";
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
const DISABLED_CRITERIA_CODES = [
  "PUBLICATION_RULES",
  "VIDEO_SHARPNESS",
  "TEXT_SPELLING_PROXY",
  "TEXT_FORBIDDEN_LEXICON",
  "TEXT_LENGTH",
  "TEXT_TEMPLATE",
  "TEXT_READABILITY",
] as const;

interface ResolvedSource {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}

interface TemplateRenderRule {
  id: string;
  name: string;
  fileNamePattern: string;
  mediaType: MediaType;
  expectedContainer?: string;
  expectedVideoCodec?: string;
  expectedAudioCodec?: string;
  expectedWidth?: string;
  expectedHeight?: string;
  expectedFps?: string;
  expectedBitrateKbps?: string;
  expectedMinDurationSec?: string;
  expectedMaxDurationSec?: string;
}

interface TemplateProfileRequirements {
  maxFileSizeMb?: string;
  allowedContainers?: string[];
  allowedVideoCodecs?: string[];
  allowedAudioCodecs?: string[];
  expectedFps?: string;
  expectedMinBitrateKbps?: string;
  expectedMaxBitrateKbps?: string;
  requireAudio?: boolean;
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
        title: dto.title.trim(),
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
          create: tagRecords.map((tag) => ({ taxonomyEntryId: tag.id })),
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
          title: dto.title?.trim() ? dto.title.trim() : media.title,
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
            create: tagRecords.map((tag) => ({ taxonomyEntryId: tag.id })),
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
        _count: { select: { access: { where: { isFavorite: true } } } },
      },
    });
    const mediaWithFavoriteCount = media.map((item) => ({
      ...item,
      _count: {
        ...item._count,
        favorites: item._count.access,
      },
    }));

    if (query.sortBy === "quality") {
      return mediaWithFavoriteCount.sort(
        (a, b) => (b.qualityChecks[0]?.finalScore ?? 0) - (a.qualityChecks[0]?.finalScore ?? 0),
      );
    }
    if (query.sortBy === "popularity") {
      return mediaWithFavoriteCount.sort((a, b) => b._count.favorites - a._count.favorites);
    }
    return mediaWithFavoriteCount;
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
          where: { isShared: true },
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

  async sendToAutomaticCheck(id: string, user: JwtPayload, options?: SendForCheckDto) {
    const media = await this.prisma.mediaItem.findUnique({ where: { id } });
    if (!media) throw new NotFoundException("Media not found");
    await this.assertCanEditMedia(media.id, user);

    const criteria = await this.prisma.qualityRule.findMany({
      where: {
        kind: QualityRuleKind.CRITERION,
        isActive: true,
        code: { notIn: [...DISABLED_CRITERIA_CODES] },
      },
      orderBy: { code: "asc" },
    });

    const selectedCriteria = this.selectCriteria(criteria, options?.criteriaCodes);
    const templateId = options?.templateId ?? "custom";

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
      title: media.title.trim() || media.fileName,
      description: media.description ?? undefined,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      fileName: media.fileName,
      fileUrl: this.storageService.getPublicUrl(media.storageKey),
      duplicateHint: duplicateCount > 0,
    });

    const filteredResult = this.filterAnalyzeResult(result, selectedCriteria);
    this.applyTemplateProfileRules(media.sizeBytes, media.type, filteredResult, options?.profileRequirements);
    this.applyTemplateRenderRules(media.fileName, media.type, filteredResult, options?.renderRules, options?.profileRequirements);
    const finalStatus = this.mapRecommendationToStatus(filteredResult);
    const qualityCheck = await this.prisma.qualityCheck.create({
      data: {
        mediaItemId: media.id,
        initiatedById: user.sub,
        status: CheckStatus.COMPLETED,
        mediaVersion: media.version,
        criteria: {
          templateId,
          items: selectedCriteria.map((criterion) => ({
          code: criterion.code,
          name: criterion.name,
          weight: criterion.weight,
          })),
        } as Prisma.InputJsonValue,
        autoResult: filteredResult.details as Prisma.InputJsonValue,
        autoScore: filteredResult.score,
        finalScore: filteredResult.score,
        finishedAt: new Date(),
      },
    });

    await this.persistViolations(media.id, media.version, qualityCheck.id, filteredResult.violations);

    const updatedMedia = await this.prisma.mediaItem.update({
      where: { id: media.id },
      data: { status: finalStatus },
    });

    await this.notificationsService.notify({
      userId: media.ownerId,
      type: "AUTO_CHECK_FINISHED",
      title: "Automatic check finished",
      message: `Automatic check for "${media.title}" is completed. Score: ${filteredResult.score}.`,
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
        violations: filteredResult.violations,
        status: updatedMedia.status,
        duplicateHint: duplicateCount > 0,
        templateId,
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
      update: { level: payload.level, isShared: true },
      create: {
        mediaItemId: mediaId,
        userId: user.id,
        level: payload.level,
        isShared: true,
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
        isFavorite: false,
      },
    });
    await this.prisma.mediaAccess.updateMany({
      where: {
        mediaItemId: mediaId,
        userId,
        isFavorite: true,
      },
      data: {
        isShared: false,
        level: AccessLevel.VIEW,
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
    const entity = await this.prisma.taxonomyEntry.upsert({
      where: {
        kind_name: {
          kind: TaxonomyKind.CATEGORY,
          name: category.trim(),
        },
      },
      update: {},
      create: { kind: TaxonomyKind.CATEGORY, name: category.trim() },
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
          this.prisma.taxonomyEntry.upsert({
            where: {
              kind_name: {
                kind: TaxonomyKind.TAG,
                name: tag,
              },
            },
            update: {},
            create: { kind: TaxonomyKind.TAG, name: tag },
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
      where.OR = [{ ownerId: user.sub }, { access: { some: { userId: user.sub, isShared: true } } }];
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
            {
              tags: {
                some: {
                  tag: {
                    kind: TaxonomyKind.TAG,
                    name: { contains: query.q, mode: "insensitive" },
                  },
                },
              },
            },
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

  private selectCriteria(
    allCriteria: Array<{ code: string; name: string; weight: number | null }>,
    selectedCodes?: string[],
  ) {
    if (!selectedCodes?.length) return allCriteria;
    const codeSet = new Set(selectedCodes.map((code) => code.trim().toUpperCase()).filter(Boolean));
    const filtered = allCriteria.filter((criterion) => codeSet.has(criterion.code));
    return filtered.length ? filtered : allCriteria;
  }

  private filterAnalyzeResult(
    result: AnalyzeResponse,
    selectedCriteria: Array<{ code: string; name: string; weight: number | null }>,
  ): AnalyzeResponse {
    const selectedAnalyzerCriteria = new Set(
      selectedCriteria.map((criterion) => criterion.code.toLowerCase()),
    );

    const filteredViolations = [...new Set(result.violations)].filter((code) => {
      const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
      const mappedCriteria = ANALYZER_VIOLATION_TO_CRITERIA[normalizedCode] ?? [];
      return mappedCriteria.some((criterion) => selectedAnalyzerCriteria.has(criterion));
    });

    const score = Math.max(
      0,
      Math.min(
        1,
        Number(
          (
            1 -
            filteredViolations.reduce((sum, code) => {
              const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
              return sum + (ANALYZER_VIOLATION_PENALTIES[normalizedCode] ?? 0);
            }, 0)
          ).toFixed(3),
        ),
      ),
    );

    const violationReasons =
      typeof result.details?.violationReasons === "object" && result.details?.violationReasons
        ? Object.fromEntries(
            Object.entries(result.details.violationReasons as Record<string, unknown>).filter(
              ([code]) => filteredViolations.includes(code),
            ),
          )
        : {};

    const checkedCriteria = Array.isArray(result.details?.checkedCriteria)
      ? (result.details.checkedCriteria as string[]).filter((criterion) =>
          selectedAnalyzerCriteria.has(String(criterion)),
        )
      : [];

    const filteredResult: AnalyzeResponse = {
      ...result,
      score,
      violations: filteredViolations,
      recommendation:
        score >= 0.85 && filteredViolations.length === 0
          ? "approved"
          : score >= 0.6
            ? "manual_review"
            : "reject",
      details: {
        ...result.details,
        checkedCriteria,
        violationReasons,
      },
    };

    return filteredResult;
  }

  private applyTemplateProfileRules(
    sizeBytes: number,
    mediaType: MediaType,
    result: AnalyzeResponse,
    profile?: TemplateProfileRequirements,
  ) {
    if (!profile) return;

    if (profile.maxFileSizeMb && sizeBytes > Number(profile.maxFileSizeMb) * 1024 * 1024) {
      this.pushTemplateViolation(
        result,
        "TEMPLATE_FILE_SIZE_MISMATCH",
        0.12,
        `Expected file size <= ${profile.maxFileSizeMb} MB`,
      );
    }

    if (mediaType === MediaType.VIDEO) {
      const metrics = (result.details.videoMetrics ?? {}) as Record<string, unknown>;
      const fps = Number(metrics.fps ?? 0);
      const bitrateKbps = Number(metrics.estimatedBitrate ?? 0) / 1000;
      const container = String(metrics.container ?? "").toLowerCase();
      const videoCodec = String(metrics.codec ?? "").toUpperCase();
      const hasAudio = Boolean(metrics.hasAudio);
      const audioCodec = String(metrics.audioCodec ?? "").toUpperCase();

      if (profile.expectedFps && Math.abs(fps - Number(profile.expectedFps)) > 0.05) {
        this.pushTemplateViolation(result, "TEMPLATE_VIDEO_FPS_MISMATCH", 0.12, `Expected FPS ${profile.expectedFps}, got ${fps}`);
      }
      if (profile.expectedMinBitrateKbps && bitrateKbps < Number(profile.expectedMinBitrateKbps)) {
        this.pushTemplateViolation(
          result,
          "TEMPLATE_VIDEO_BITRATE_MIN_MISMATCH",
          0.1,
          `Expected bitrate >= ${profile.expectedMinBitrateKbps} kbps, got ${Math.round(bitrateKbps)}`,
        );
      }
      if (profile.expectedMaxBitrateKbps && bitrateKbps > Number(profile.expectedMaxBitrateKbps)) {
        this.pushTemplateViolation(
          result,
          "TEMPLATE_VIDEO_BITRATE_MAX_MISMATCH",
          0.1,
          `Expected bitrate <= ${profile.expectedMaxBitrateKbps} kbps, got ${Math.round(bitrateKbps)}`,
        );
      }
      if (profile.allowedContainers?.length && !profile.allowedContainers.some((item) => item.trim().toLowerCase() === container)) {
        this.pushTemplateViolation(
          result,
          "TEMPLATE_VIDEO_CONTAINER_MISMATCH",
          0.08,
          `Expected one of ${profile.allowedContainers.join(", ")}, got ${container}`,
        );
      }
      if (profile.allowedVideoCodecs?.length && !profile.allowedVideoCodecs.some((item) => item.trim().toUpperCase() === videoCodec)) {
        this.pushTemplateViolation(
          result,
          "TEMPLATE_VIDEO_CODEC_MISMATCH",
          0.08,
          `Expected one of ${profile.allowedVideoCodecs.join(", ")}, got ${videoCodec}`,
        );
      }
      if (profile.requireAudio !== undefined && profile.requireAudio !== hasAudio) {
        this.pushTemplateViolation(
          result,
          "TEMPLATE_AUDIO_PRESENCE_MISMATCH",
          0.1,
          `Expected audio presence ${profile.requireAudio}, got ${hasAudio}`,
        );
      }
      if (
        profile.requireAudio &&
        profile.allowedAudioCodecs?.length &&
        audioCodec &&
        !profile.allowedAudioCodecs.some((item) => item.trim().toUpperCase() === audioCodec)
      ) {
        this.pushTemplateViolation(
          result,
          "TEMPLATE_AUDIO_CODEC_MISMATCH",
          0.08,
          `Expected one of ${profile.allowedAudioCodecs.join(", ")}, got ${audioCodec}`,
        );
      }
    }
  }

  private applyTemplateRenderRules(
    fileName: string,
    mediaType: MediaType,
    result: AnalyzeResponse,
    renderRules?: TemplateRenderRule[],
    profile?: TemplateProfileRequirements,
  ) {
    const rulesForType = (renderRules ?? []).filter((rule) => rule.mediaType === mediaType);
    if (!rulesForType.length) return;

    const matchedRule = rulesForType.find((rule) => this.matchesFilePattern(fileName, rule.fileNamePattern));
    if (!matchedRule) {
      this.pushTemplateViolation(
        result,
        "TEMPLATE_RENDER_NOT_FOUND",
        0.18,
        `No render rule matched file name ${fileName}`,
      );
      return;
    }

    if (mediaType === MediaType.VIDEO) {
      this.applyVideoRenderRule(result, matchedRule, profile);
    }

    if (mediaType === MediaType.IMAGE) {
      this.applyImageRenderRule(result, matchedRule);
    }
  }

  private applyVideoRenderRule(
    result: AnalyzeResponse,
    rule: TemplateRenderRule,
    profile?: TemplateProfileRequirements,
  ) {
    const metrics = (result.details.videoMetrics ?? {}) as Record<string, unknown>;
    const width = Number(metrics.width ?? 0);
    const height = Number(metrics.height ?? 0);
    const fps = Number(metrics.fps ?? 0);
    const bitrateKbps = Number(metrics.estimatedBitrate ?? 0) / 1000;
    const durationSec = Number(metrics.durationSec ?? 0);
    const container = String(metrics.container ?? "").toLowerCase();
    const codec = String(metrics.codec ?? "").toUpperCase();

    if (rule.expectedWidth && width !== Number(rule.expectedWidth)) {
      this.pushTemplateViolation(result, "TEMPLATE_VIDEO_WIDTH_MISMATCH", 0.12, `Expected width ${rule.expectedWidth}, got ${width}`);
    }
    if (rule.expectedHeight && height !== Number(rule.expectedHeight)) {
      this.pushTemplateViolation(result, "TEMPLATE_VIDEO_HEIGHT_MISMATCH", 0.12, `Expected height ${rule.expectedHeight}, got ${height}`);
    }
    if (!profile?.expectedFps && rule.expectedFps && Math.abs(fps - Number(rule.expectedFps)) > 0.05) {
      this.pushTemplateViolation(result, "TEMPLATE_VIDEO_FPS_MISMATCH", 0.12, `Expected FPS ${rule.expectedFps}, got ${fps}`);
    }
    if (rule.expectedBitrateKbps && bitrateKbps < Number(rule.expectedBitrateKbps)) {
      this.pushTemplateViolation(
        result,
        "TEMPLATE_VIDEO_BITRATE_MISMATCH",
        0.1,
        `Expected bitrate >= ${rule.expectedBitrateKbps} kbps, got ${Math.round(bitrateKbps)}`,
      );
    }
    if (rule.expectedMinDurationSec && durationSec < Number(rule.expectedMinDurationSec)) {
      this.pushTemplateViolation(
        result,
        "TEMPLATE_VIDEO_DURATION_MIN_MISMATCH",
        0.08,
        `Expected duration >= ${rule.expectedMinDurationSec} sec, got ${durationSec}`,
      );
    }
    if (rule.expectedMaxDurationSec && durationSec > Number(rule.expectedMaxDurationSec)) {
      this.pushTemplateViolation(
        result,
        "TEMPLATE_VIDEO_DURATION_MAX_MISMATCH",
        0.08,
        `Expected duration <= ${rule.expectedMaxDurationSec} sec, got ${durationSec}`,
      );
    }
    if (rule.expectedContainer && container && container !== rule.expectedContainer.trim().toLowerCase()) {
      this.pushTemplateViolation(
        result,
        "TEMPLATE_VIDEO_CONTAINER_MISMATCH",
        0.08,
        `Expected container ${rule.expectedContainer}, got ${container}`,
      );
    }
    if (rule.expectedVideoCodec && codec && codec !== rule.expectedVideoCodec.trim().toUpperCase()) {
      this.pushTemplateViolation(
        result,
        "TEMPLATE_VIDEO_CODEC_MISMATCH",
        0.08,
        `Expected codec ${rule.expectedVideoCodec}, got ${codec}`,
      );
    }
  }

  private applyImageRenderRule(result: AnalyzeResponse, rule: TemplateRenderRule) {
    const metrics = (result.details.imageResolution ?? {}) as Record<string, unknown>;
    const width = Number(metrics.width ?? 0);
    const height = Number(metrics.height ?? 0);

    if (rule.expectedWidth && width !== Number(rule.expectedWidth)) {
      this.pushTemplateViolation(result, "TEMPLATE_IMAGE_WIDTH_MISMATCH", 0.12, `Expected width ${rule.expectedWidth}, got ${width}`);
    }
    if (rule.expectedHeight && height !== Number(rule.expectedHeight)) {
      this.pushTemplateViolation(result, "TEMPLATE_IMAGE_HEIGHT_MISMATCH", 0.12, `Expected height ${rule.expectedHeight}, got ${height}`);
    }
  }

  private pushTemplateViolation(
    result: AnalyzeResponse,
    code: string,
    penalty: number,
    reason: string,
  ) {
    if (!result.violations.includes(code)) {
      result.violations.push(code);
    }
    result.details.violationReasons = {
      ...((result.details.violationReasons as Record<string, string> | undefined) ?? {}),
      [code]: reason,
    };
    result.score = Math.max(0, Number((result.score - penalty).toFixed(3)));
    result.recommendation =
      result.score >= 0.85 && result.violations.length === 0
        ? "approved"
        : result.score >= 0.6
          ? "manual_review"
          : "reject";
  }

  private matchesFilePattern(fileName: string, pattern: string) {
    const normalize = (value: string) =>
      value.trim().replace(/×/g, "x");

    const normalizedPattern = normalize(pattern);
    if (!normalizedPattern) return false;

    const escaped = normalizedPattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    const matcher = new RegExp(`^${escaped}$`, "i");
    const normalizedFileName = normalize(fileName);
    const fileNameWithoutExtension = normalizedFileName.replace(/\.[^.]+$/, "");

    return matcher.test(normalizedFileName) || matcher.test(fileNameWithoutExtension);
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
      const dictionary = await this.prisma.qualityRule.findFirst({
        where: { code: normalizedCode, kind: QualityRuleKind.VIOLATION },
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

    const hasAccess =
      media.ownerId === user.sub ||
      media.access.some((access) => access.userId === user.sub && access.isShared);
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

    const access = media.access.find((a) => a.userId === user.sub && a.isShared);
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

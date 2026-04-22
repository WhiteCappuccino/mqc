import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MediaStatus, ModerationStatus, Role, ViolationSource } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { JwtPayload } from "../auth/jwt-payload.interface";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { ModerationDecisionDto } from "./dto/moderation-decision.dto";

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  listQueue() {
    return this.prisma.mediaItem.findMany({
      where: {
        status: {
          in: [MediaStatus.NEEDS_MANUAL_MODERATION, MediaStatus.AUTO_CHECKED],
        },
      },
      include: {
        owner: { select: { id: true, fullName: true, username: true } },
        qualityChecks: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { violations: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  listViolationHistory() {
    return this.prisma.violation.findMany({
      include: {
        mediaItem: { select: { id: true, title: true } },
        qualityCheck: { select: { id: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  }

  async addManualViolation(
    mediaId: string,
    payload: { type: string; description: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; marker?: string; coordinates?: string },
    user: JwtPayload,
  ) {
    this.assertModerator(user);

    const media = await this.prisma.mediaItem.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException("Media not found");

    const violation = await this.prisma.violation.create({
      data: {
        mediaItemId: media.id,
        type: payload.type,
        description: payload.description,
        severity: payload.severity,
        marker: payload.marker,
        coordinates: payload.coordinates,
        source: ViolationSource.MODERATOR,
      },
    });

    await this.auditService.log({
      actorId: user.sub,
      action: "ADD_MANUAL_VIOLATION",
      entityType: "MEDIA",
      entityId: media.id,
      metadata: payload,
    });

    return violation;
  }

  async submitDecision(mediaId: string, dto: ModerationDecisionDto, user: JwtPayload) {
    this.assertModerator(user);

    const media = await this.prisma.mediaItem.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException("Media not found");

    const mediaStatus = this.mapToMediaStatus(dto.status);
    const result = await this.prisma.$transaction(async (transaction) => {
      const decision = await transaction.moderationDecision.create({
        data: {
          mediaItemId: mediaId,
          moderatorId: user.sub,
          status: dto.status,
          comment: dto.comment,
          qualityLevel: dto.qualityLevel,
        },
      });

      const updated = await transaction.mediaItem.update({
        where: { id: mediaId },
        data: { status: mediaStatus },
      });

      return { decision, media: updated };
    });

    await this.notificationsService.notifyMaterialOwnerStatusChanged(
      media.ownerId,
      media.title,
      result.media.status,
    );

    await this.auditService.log({
      actorId: user.sub,
      action: "MODERATION_DECISION",
      entityType: "MEDIA",
      entityId: mediaId,
      metadata: {
        status: dto.status,
        qualityLevel: dto.qualityLevel,
        comment: dto.comment,
      },
    });

    return result;
  }

  private assertModerator(user: JwtPayload) {
    if (user.role !== Role.MODERATOR && user.role !== Role.ADMIN) {
      throw new ForbiddenException("Moderator role required");
    }
  }

  private mapToMediaStatus(status: ModerationStatus): MediaStatus {
    const statusMap: Record<ModerationStatus, MediaStatus> = {
      APPROVED: MediaStatus.APPROVED,
      REJECTED: MediaStatus.REJECTED,
      NEEDS_REVISION: MediaStatus.ON_REVISION,
    };
    return statusMap[status];
  }
}

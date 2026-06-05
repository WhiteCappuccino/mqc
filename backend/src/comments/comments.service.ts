import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { JwtPayload } from "../auth/jwt-payload.interface";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCommentDto } from "./dto/create-comment.dto";

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async listByMedia(mediaId: string, user: JwtPayload) {
    await this.assertCanReadMedia(mediaId, user);

    return this.prisma.comment.findMany({
      where: {
        mediaItemId: mediaId,
      },
      include: this.commentInclude(),
      orderBy: { createdAt: "asc" },
    });
  }

  async create(dto: CreateCommentDto, user: JwtPayload) {
    const targetMediaId = await this.resolveTargetMediaId(dto);
    await this.assertCanReadMedia(targetMediaId, user);
    const targetMedia = await this.prisma.mediaItem.findUnique({
      where: { id: targetMediaId },
      select: { version: true },
    });

    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException("Parent comment not found");
    }

    const comment = await this.prisma.comment.create({
      data: {
        authorId: user.sub,
        text: dto.text,
        mediaVersion: targetMedia?.version,
        mediaItemId: dto.mediaItemId,
        qualityCheckId: dto.qualityCheckId,
        violationId: dto.violationId,
        parentId: dto.parentId,
      },
      include: this.commentInclude(),
    });

    await this.notifyParticipants(comment.id, user.sub, targetMediaId, dto.parentId);
    await this.auditService.log({
      actorId: user.sub,
      action: "CREATE_COMMENT",
      entityType: "COMMENT",
      entityId: comment.id,
      metadata: {
        mediaItemId: dto.mediaItemId,
        qualityCheckId: dto.qualityCheckId,
        violationId: dto.violationId,
        parentId: dto.parentId,
      },
    });

    return comment;
  }

  async resolve(commentId: string, isResolved: boolean, user: JwtPayload) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        mediaItem: {
          include: { access: true },
        },
      },
    });
    if (!comment) throw new NotFoundException("Comment not found");

    if (!comment.mediaItemId) {
      throw new BadRequestException("Comment is not linked to a media item");
    }
    this.assertCanResolve(comment.authorId, comment.mediaItem?.ownerId, user);
    await this.assertCanReadMedia(comment.mediaItemId, user);

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { isResolved },
      include: this.commentInclude(),
    });

    await this.auditService.log({
      actorId: user.sub,
      action: "RESOLVE_COMMENT",
      entityType: "COMMENT",
      entityId: commentId,
      metadata: { isResolved },
    });

    return updated;
  }

  private commentInclude() {
    return {
      author: { select: { id: true, fullName: true, username: true } },
      replies: {
        include: {
          author: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    } as const;
  }

  private async resolveTargetMediaId(dto: CreateCommentDto) {
    if (dto.mediaItemId) return dto.mediaItemId;
    if (dto.qualityCheckId) {
      const check = await this.prisma.qualityCheck.findUnique({
        where: { id: dto.qualityCheckId },
        select: { mediaItemId: true },
      });
      if (!check) throw new NotFoundException("Quality check not found");
      return check.mediaItemId;
    }
    if (dto.violationId) {
      const violation = await this.prisma.violation.findUnique({
        where: { id: dto.violationId },
        select: { mediaItemId: true },
      });
      if (!violation) throw new NotFoundException("Violation not found");
      return violation.mediaItemId;
    }
    throw new BadRequestException("A comment target is required");
  }

  private async notifyParticipants(
    commentId: string,
    authorId: string,
    mediaItemId: string,
    parentId?: string,
  ) {
    const media = await this.prisma.mediaItem.findUnique({
      where: { id: mediaItemId },
      select: { id: true, title: true, ownerId: true },
    });
    if (!media) return;

    if (media.ownerId !== authorId) {
      const owner = await this.prisma.user.findUnique({
        where: { id: media.ownerId },
        select: { notificationEmail: true },
      });
      if (owner) {
        await this.notificationsService.notify({
          userId: media.ownerId,
          type: "NEW_COMMENT",
          title: "New comment on your media",
          message: `A new comment was added to "${media.title}".`,
          alsoEmail: owner.notificationEmail,
        });
      }
    }

    if (!parentId) return;

    const parent = await this.prisma.comment.findUnique({
      where: { id: parentId },
      select: { authorId: true },
    });
    if (!parent || parent.authorId === authorId) return;

    const parentAuthor = await this.prisma.user.findUnique({
      where: { id: parent.authorId },
      select: { notificationEmail: true },
    });
    if (!parentAuthor) return;

    await this.notificationsService.notify({
      userId: parent.authorId,
      type: "NEW_COMMENT",
      title: "Reply to your comment",
      message: `Your comment received a reply in media "${media.title}".`,
      alsoEmail: parentAuthor.notificationEmail,
    });

    await this.auditService.log({
      actorId: authorId,
      action: "COMMENT_REPLY",
      entityType: "COMMENT",
      entityId: commentId,
      metadata: { parentId },
    });
  }

  private async assertCanReadMedia(mediaId: string, user: JwtPayload) {
    const media = await this.prisma.mediaItem.findUnique({
      where: { id: mediaId },
      include: { access: true },
    });
    if (!media) throw new NotFoundException("Media not found");

    if (user.role === Role.ADMIN || user.role === Role.MODERATOR) return;
    if (media.ownerId === user.sub) return;
    if (media.access.some((entry) => entry.userId === user.sub && entry.isShared)) return;
    throw new ForbiddenException("Access denied");
  }

  private assertCanResolve(authorId: string, ownerId: string | undefined, user: JwtPayload) {
    if (user.role === Role.ADMIN || user.role === Role.MODERATOR) return;
    if (user.sub === authorId) return;
    if (ownerId && user.sub === ownerId) return;
    throw new ForbiddenException("Cannot resolve this comment");
  }
}

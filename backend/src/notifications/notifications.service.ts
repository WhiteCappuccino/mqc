import { Injectable } from "@nestjs/common";
import {
  NotificationChannel,
  NotificationType,
  Role,
  User,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  alsoEmail?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async notify(input: CreateNotificationInput) {
    await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        channel: NotificationChannel.IN_APP,
        title: input.title,
        message: input.message,
      },
    });

    if (input.alsoEmail) {
      await this.prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          channel: NotificationChannel.EMAIL,
          title: input.title,
          message: input.message,
        },
      });
    }
  }

  async listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async notifyModeratorsAboutNewCheck(mediaId: string, title: string) {
    const moderators = await this.prisma.user.findMany({
      where: {
        role: {
          in: [Role.MODERATOR, Role.ADMIN],
        },
        isActive: true,
      },
      select: { id: true, notificationEmail: true },
    });

    await Promise.all(
      moderators.map((moderator) =>
        this.notify({
          userId: moderator.id,
          type: NotificationType.MODERATION_ASSIGNED,
          title: "New moderation task",
          message: `Material "${title}" (${mediaId}) requires moderation.`,
          alsoEmail: moderator.notificationEmail,
        }),
      ),
    );
  }

  async notifyMaterialOwnerStatusChanged(ownerId: string, title: string, status: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { notificationEmail: true },
    });
    if (!user) return;

    const type =
      status === "ON_REVISION"
        ? NotificationType.REVISION_REQUIRED
        : NotificationType.STATUS_CHANGED;
    await this.notify({
      userId: ownerId,
      type,
      title: "Material status changed",
      message: `Material "${title}" now has status: ${status}.`,
      alsoEmail: user.notificationEmail,
    });
  }
}

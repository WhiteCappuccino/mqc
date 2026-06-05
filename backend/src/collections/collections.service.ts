import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AccessLevel, Role } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { JwtPayload } from "../auth/jwt-payload.interface";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { AddCollectionItemDto } from "./dto/add-collection-item.dto";
import { CreateCollectionDto } from "./dto/create-collection.dto";
import { ShareCollectionDto } from "./dto/share-collection.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  list(user: JwtPayload) {
    if (user.role === Role.ADMIN || user.role === Role.MODERATOR) {
      return this.prisma.collection.findMany({
        include: this.collectionInclude(),
        orderBy: { updatedAt: "desc" },
      });
    }

    return this.prisma.collection.findMany({
      where: {
        OR: [
          { ownerId: user.sub },
          { isPrivate: false },
          { collaborators: { some: { userId: user.sub } } },
        ],
      },
      include: this.collectionInclude(),
      orderBy: { updatedAt: "desc" },
    });
  }

  async getById(collectionId: string, user: JwtPayload) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: this.collectionInclude(),
    });
    if (!collection) throw new NotFoundException("Collection not found");

    this.assertCanReadCollection(collection, user);
    return collection;
  }

  async create(dto: CreateCollectionDto, user: JwtPayload) {
    const collection = await this.prisma.collection.create({
      data: {
        ownerId: user.sub,
        name: dto.name,
        description: dto.description,
        isPrivate: dto.isPrivate ?? true,
      },
      include: this.collectionInclude(),
    });

    await this.auditService.log({
      actorId: user.sub,
      action: "CREATE_COLLECTION",
      entityType: "COLLECTION",
      entityId: collection.id,
      metadata: {
        name: collection.name,
        isPrivate: collection.isPrivate,
      },
    });

    return collection;
  }

  async update(collectionId: string, dto: UpdateCollectionDto, user: JwtPayload) {
    const collection = await this.requireCollection(collectionId);
    this.assertCanManageCollection(collection, user);

    const updated = await this.prisma.collection.update({
      where: { id: collectionId },
      data: {
        name: dto.name,
        description: dto.description,
        isPrivate: dto.isPrivate,
      },
      include: this.collectionInclude(),
    });

    await this.auditService.log({
      actorId: user.sub,
      action: "UPDATE_COLLECTION",
      entityType: "COLLECTION",
      entityId: collectionId,
      metadata: { ...dto },
    });

    return updated;
  }

  async remove(collectionId: string, user: JwtPayload) {
    const collection = await this.requireCollection(collectionId);
    this.assertCanManageCollection(collection, user);

    await this.prisma.collection.delete({ where: { id: collectionId } });
    await this.auditService.log({
      actorId: user.sub,
      action: "DELETE_COLLECTION",
      entityType: "COLLECTION",
      entityId: collectionId,
      metadata: {},
    });
    return { ok: true };
  }

  async addItem(collectionId: string, dto: AddCollectionItemDto, user: JwtPayload) {
    const collection = await this.requireCollection(collectionId);
    await this.assertCanEditCollection(collection.id, user);
    await this.assertCanReadMedia(dto.mediaItemId, user);

    await this.prisma.collectionItem.upsert({
      where: {
        collectionId_mediaItemId: {
          collectionId,
          mediaItemId: dto.mediaItemId,
        },
      },
      update: {},
      create: {
        collectionId,
        mediaItemId: dto.mediaItemId,
      },
    });

    await this.auditService.log({
      actorId: user.sub,
      action: "COLLECTION_ADD_ITEM",
      entityType: "COLLECTION",
      entityId: collectionId,
      metadata: { mediaItemId: dto.mediaItemId },
    });

    return this.getById(collectionId, user);
  }

  async removeItem(collectionId: string, mediaItemId: string, user: JwtPayload) {
    const collection = await this.requireCollection(collectionId);
    await this.assertCanEditCollection(collection.id, user);

    await this.prisma.collectionItem.deleteMany({
      where: {
        collectionId,
        mediaItemId,
      },
    });

    await this.auditService.log({
      actorId: user.sub,
      action: "COLLECTION_REMOVE_ITEM",
      entityType: "COLLECTION",
      entityId: collectionId,
      metadata: { mediaItemId },
    });

    return { ok: true };
  }

  async share(collectionId: string, dto: ShareCollectionDto, user: JwtPayload) {
    const collection = await this.requireCollection(collectionId);
    this.assertCanManageCollection(collection, user);

    const invitedUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!invitedUser) {
      throw new NotFoundException("User not found");
    }

    const collaborator = await this.prisma.collectionCollaborator.upsert({
      where: {
        collectionId_userId: {
          collectionId,
          userId: invitedUser.id,
        },
      },
      update: { level: dto.level },
      create: {
        collectionId,
        userId: invitedUser.id,
        level: dto.level,
      },
    });

    await this.notificationsService.notify({
      userId: invitedUser.id,
      type: "COLLAB_INVITE",
      title: "Collection access granted",
      message: `You were invited to collection "${collection.name}" with ${dto.level} access.`,
      alsoEmail: invitedUser.notificationEmail,
    });

    await this.auditService.log({
      actorId: user.sub,
      action: "COLLECTION_SHARE",
      entityType: "COLLECTION",
      entityId: collectionId,
      metadata: { invitedUserId: invitedUser.id, level: dto.level },
    });

    return collaborator;
  }

  async removeCollaborator(collectionId: string, targetUserId: string, user: JwtPayload) {
    const collection = await this.requireCollection(collectionId);
    this.assertCanManageCollection(collection, user);

    await this.prisma.collectionCollaborator.deleteMany({
      where: {
        collectionId,
        userId: targetUserId,
      },
    });

    await this.auditService.log({
      actorId: user.sub,
      action: "COLLECTION_UNSHARE",
      entityType: "COLLECTION",
      entityId: collectionId,
      metadata: { targetUserId },
    });

    return { ok: true };
  }

  private collectionInclude() {
    return {
      owner: { select: { id: true, fullName: true, username: true, email: true } },
      items: {
        include: {
          mediaItem: {
            include: {
              owner: { select: { id: true, fullName: true, username: true } },
              tags: { include: { tag: true } },
              category: true,
              qualityChecks: { take: 1, orderBy: { createdAt: "desc" } },
            },
          },
        },
      },
      collaborators: {
        include: {
          user: { select: { id: true, fullName: true, username: true, email: true } },
        },
      },
    } as const;
  }

  private async requireCollection(collectionId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        collaborators: true,
      },
    });
    if (!collection) throw new NotFoundException("Collection not found");
    return collection;
  }

  private assertCanReadCollection(
    collection: { ownerId: string; isPrivate: boolean; collaborators: { userId: string }[] },
    user: JwtPayload,
  ) {
    if (user.role === Role.ADMIN || user.role === Role.MODERATOR) return;
    if (collection.ownerId === user.sub) return;
    if (!collection.isPrivate) return;
    if (collection.collaborators.some((entry) => entry.userId === user.sub)) return;
    throw new ForbiddenException("Access denied");
  }

  private assertCanManageCollection(
    collection: { ownerId: string },
    user: JwtPayload,
  ) {
    if (collection.ownerId === user.sub || user.role === Role.ADMIN) return;
    throw new ForbiddenException("Only owner can manage collection");
  }

  private async assertCanEditCollection(collectionId: string, user: JwtPayload) {
    if (user.role === Role.ADMIN) return;

    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        collaborators: {
          where: {
            userId: user.sub,
          },
        },
      },
    });
    if (!collection) throw new NotFoundException("Collection not found");

    if (collection.ownerId === user.sub) return;
    const collaborator = collection.collaborators[0];
    if (!collaborator) {
      throw new ForbiddenException("Access denied");
    }
    if (
      collaborator.level === AccessLevel.VIEW ||
      collaborator.level === AccessLevel.COMMENT
    ) {
      throw new ForbiddenException("Edit access denied");
    }
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
    throw new ForbiddenException("No access to selected media");
  }
}

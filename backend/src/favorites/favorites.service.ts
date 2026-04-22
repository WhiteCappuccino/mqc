import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtPayload } from "../auth/jwt-payload.interface";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: JwtPayload) {
    return this.prisma.favorite.findMany({
      where: { userId: user.sub },
      include: {
        mediaItem: {
          include: {
            owner: { select: { id: true, fullName: true, username: true } },
            category: true,
            tags: { include: { tag: true } },
            qualityChecks: { take: 1, orderBy: { createdAt: "desc" } },
            decisions: { take: 1, orderBy: { createdAt: "desc" } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async add(mediaId: string, user: JwtPayload) {
    const media = await this.prisma.mediaItem.findUnique({
      where: { id: mediaId },
      include: { access: true },
    });
    if (!media) throw new NotFoundException("Media not found");
    this.assertCanReadMedia(media.ownerId, media.access.map((entry) => entry.userId), user);

    return this.prisma.favorite.upsert({
      where: {
        userId_mediaItemId: {
          userId: user.sub,
          mediaItemId: mediaId,
        },
      },
      update: {},
      create: {
        userId: user.sub,
        mediaItemId: mediaId,
      },
    });
  }

  async remove(mediaId: string, user: JwtPayload) {
    await this.prisma.favorite.deleteMany({
      where: {
        userId: user.sub,
        mediaItemId: mediaId,
      },
    });
    return { ok: true };
  }

  private assertCanReadMedia(ownerId: string, accessUserIds: string[], user: JwtPayload) {
    if (user.role === Role.ADMIN || user.role === Role.MODERATOR) return;
    if (ownerId === user.sub) return;
    if (accessUserIds.includes(user.sub)) return;
    throw new ForbiddenException("Access denied");
  }
}


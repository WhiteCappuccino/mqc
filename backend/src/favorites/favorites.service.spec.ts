import { ForbiddenException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FavoritesService } from "./favorites.service";

describe("FavoritesService", () => {
  let prisma: jest.Mocked<PrismaService>;
  let service: FavoritesService;

  beforeEach(() => {
    prisma = {
      mediaAccess: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      mediaItem: {
        findUnique: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new FavoritesService(prisma);
  });

  it("lists favorites from media access rows marked as favorite", async () => {
    await service.list({ sub: "u1", email: "u1@example.com", username: "u1", role: Role.USER });

    expect(prisma.mediaAccess.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1", isFavorite: true },
        orderBy: { favoritedAt: "desc" },
      }),
    );
  });

  it("adds owner favorite without granting shared access", async () => {
    prisma.mediaItem.findUnique.mockResolvedValue({
      id: "m1",
      ownerId: "u1",
      access: [],
    } as never);

    await service.add("m1", { sub: "u1", email: "u1@example.com", username: "u1", role: Role.USER });

    expect(prisma.mediaAccess.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          mediaItemId: "m1",
          userId: "u1",
          isShared: false,
          isFavorite: true,
        }),
      }),
    );
  });

  it("does not treat favorite-only rows as read access", async () => {
    prisma.mediaItem.findUnique.mockResolvedValue({
      id: "m1",
      ownerId: "owner",
      access: [{ userId: "u1", isShared: false }],
    } as never);

    await expect(
      service.add("m1", { sub: "u1", email: "u1@example.com", username: "u1", role: Role.USER }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("removes favorite flag without deleting shared access", async () => {
    await service.remove("m1", { sub: "u1", email: "u1@example.com", username: "u1", role: Role.USER });

    expect(prisma.mediaAccess.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "u1",
        mediaItemId: "m1",
        isShared: true,
      },
      data: {
        isFavorite: false,
        favoritedAt: null,
      },
    });
    expect(prisma.mediaAccess.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "u1",
        mediaItemId: "m1",
        isShared: false,
      },
    });
  });
});

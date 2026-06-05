import { AccessLevel, Role } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AnalyzerClientService } from "../analyzer/analyzer-client.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { MediaService } from "./media.service";

describe("MediaService", () => {
  let prisma: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;
  let service: MediaService;

  beforeEach(() => {
    prisma = {
      mediaItem: {
        findUnique: jest.fn(),
      },
      mediaAccess: {
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    auditService = {
      log: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    service = new MediaService(
      prisma,
      {} as StorageService,
      {} as AnalyzerClientService,
      {} as NotificationsService,
      auditService,
    );
  });

  it("revokes shared access without deleting a favorite row", async () => {
    prisma.mediaItem.findUnique.mockResolvedValue({
      id: "m1",
      ownerId: "owner",
      title: "Media",
    } as never);

    await service.revokeAccess(
      "m1",
      { sub: "owner", email: "owner@example.com", username: "owner", role: Role.USER },
      "u1",
    );

    expect(prisma.mediaAccess.deleteMany).toHaveBeenCalledWith({
      where: {
        mediaItemId: "m1",
        userId: "u1",
        isFavorite: false,
      },
    });
    expect(prisma.mediaAccess.updateMany).toHaveBeenCalledWith({
      where: {
        mediaItemId: "m1",
        userId: "u1",
        isFavorite: true,
      },
      data: {
        isShared: false,
        level: AccessLevel.VIEW,
      },
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "REVOKE_MEDIA_ACCESS",
        entityId: "m1",
      }),
    );
  });
});

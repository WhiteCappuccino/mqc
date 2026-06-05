import { QualityRuleKind } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "./users.service";

describe("UsersService", () => {
  let prisma: jest.Mocked<PrismaService>;
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      auditLog: {
        create: jest.fn(),
        count: jest.fn(),
      },
      qualityRule: {
        upsert: jest.fn(),
      },
      systemSetting: {
        upsert: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new UsersService(prisma);
  });

  it("stores login attempts in audit log metadata", async () => {
    await service.createLoginHistory("u1", false, "127.0.0.1", "jest");

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "u1",
        action: "LOGIN_ATTEMPT",
        entityType: "USER",
        entityId: "u1",
        metadata: {
          success: false,
          ipAddress: "127.0.0.1",
          userAgent: "jest",
        },
      },
    });
  });

  it("counts recent failed logins from audit log metadata", async () => {
    await service.countRecentFailedLogins("u1", 15);

    expect(prisma.auditLog.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        actorId: "u1",
        action: "LOGIN_ATTEMPT",
        entityType: "USER",
        metadata: {
          path: ["success"],
          equals: false,
        },
      }),
    });
  });

  it("seeds criteria and violation dictionary as typed quality rules", async () => {
    await service.ensureDefaultData();

    expect(prisma.qualityRule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          code: "IMG_RESOLUTION",
          kind: QualityRuleKind.CRITERION,
        }),
      }),
    );
    expect(prisma.qualityRule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          code: "LOW_RESOLUTION",
          kind: QualityRuleKind.VIOLATION,
        }),
      }),
    );
  });
});

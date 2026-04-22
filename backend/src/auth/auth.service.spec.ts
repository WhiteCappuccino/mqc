import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Role } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let usersService: jest.Mocked<UsersService>;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let auditService: jest.Mocked<AuditService>;
  let service: AuthService;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    prisma = {
      emailVerificationToken: {
        create: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    jwtService = {
      sign: jest.fn().mockReturnValue("token"),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn().mockImplementation((_key: string, fallback?: string) => fallback),
    } as unknown as jest.Mocked<ConfigService>;

    notificationsService = {
      notify: jest.fn(),
    } as unknown as jest.Mocked<NotificationsService>;

    auditService = {
      log: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    service = new AuthService(
      usersService,
      prisma,
      jwtService,
      configService,
      notificationsService,
      auditService,
    );
  });

  it("registers user and returns token payload", async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.findByUsername.mockResolvedValue(null);
    usersService.create.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      username: "user1",
      fullName: "User One",
      passwordHash: "hash",
      role: Role.USER,
      isActive: true,
      emailVerified: false,
      notificationEmail: true,
      notificationInApp: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await service.register({
      email: "user@example.com",
      password: "Password123!",
      username: "user1",
      fullName: "User One",
    });

    expect(response.accessToken).toBe("token");
    expect(response.email).toBe("user@example.com");
    expect(response.username).toBe("user1");
    expect(prisma.emailVerificationToken.create).toHaveBeenCalled();
    expect(jwtService.sign).toHaveBeenCalled();
  });
});

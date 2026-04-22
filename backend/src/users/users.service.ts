import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Role, User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        emailVerified: true,
        notificationEmail: true,
        notificationInApp: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateProfile(
    userId: string,
    data: {
      fullName?: string;
      username?: string;
      notificationEmail?: boolean;
      notificationInApp?: boolean;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        emailVerified: true,
        notificationEmail: true,
        notificationInApp: true,
      },
    });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) {
      throw new NotFoundException("Invalid current password");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  getOwnHistory(userId: string) {
    return this.prisma.mediaItem.findMany({
      where: { ownerId: userId },
      include: {
        qualityChecks: { orderBy: { createdAt: "desc" }, take: 3 },
        decisions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  updateUserRole(userId: string, role: Role) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  setUserActive(userId: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
  }

  createLoginHistory(userId: string, success: boolean, ipAddress?: string, userAgent?: string) {
    return this.prisma.loginHistory.create({
      data: {
        userId,
        success,
        ipAddress,
        userAgent,
      },
    });
  }

  countRecentFailedLogins(userId: string, minutes = 15) {
    const fromDate = new Date(Date.now() - minutes * 60 * 1000);
    return this.prisma.loginHistory.count({
      where: { userId, success: false, createdAt: { gte: fromDate } },
    });
  }

  async ensureAdminExists() {
    const admin = await this.findByEmail("admin@example.com");
    if (!admin) {
      const passwordHash = await bcrypt.hash("Admin123!", 10);
      await this.create({
        email: "admin@example.com",
        username: "admin",
        fullName: "System Administrator",
        passwordHash,
        role: Role.ADMIN,
        emailVerified: true,
      });
    }
  }

  async ensureDefaultData() {
    const criteria = [
      { code: "IMG_RESOLUTION", name: "Image resolution", weight: 1 },
      { code: "IMG_SHARPNESS", name: "Image sharpness", weight: 1 },
      { code: "TEXT_PROFANITY", name: "Forbidden vocabulary", weight: 2 },
      { code: "VIDEO_DURATION", name: "Video duration", weight: 1 },
      { code: "AUDIO_LOUDNESS", name: "Audio loudness", weight: 1 },
    ];
    for (const criterion of criteria) {
      await this.prisma.qualityCriterion.upsert({
        where: { code: criterion.code },
        update: {},
        create: criterion,
      });
    }

    const violations = [
      {
        code: "LOW_RESOLUTION",
        name: "Low resolution",
        defaultSeverity: "MEDIUM" as const,
      },
      {
        code: "BLUR",
        name: "Blurred content",
        defaultSeverity: "HIGH" as const,
      },
      {
        code: "FORBIDDEN_CONTENT",
        name: "Forbidden content",
        defaultSeverity: "CRITICAL" as const,
      },
    ];
    for (const violation of violations) {
      await this.prisma.violationDictionary.upsert({
        where: { code: violation.code },
        update: {},
        create: violation,
      });
    }

    await this.prisma.systemSetting.upsert({
      where: { key: "false_positive_threshold" },
      update: {},
      create: {
        key: "false_positive_threshold",
        value: "0.2",
        description: "Max acceptable false positive ratio",
      },
    });
  }
}

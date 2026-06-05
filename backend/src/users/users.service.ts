import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, QualityRuleKind, Role, User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import {
  QUALITY_CRITERION_TEMPLATES,
  VIOLATION_DICTIONARY_TEMPLATES,
} from "../quality/quality-rule-templates";

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
    return this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: "LOGIN_ATTEMPT",
        entityType: "USER",
        entityId: userId,
        metadata: {
          success,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      },
    });
  }

  countRecentFailedLogins(userId: string, minutes = 15) {
    const fromDate = new Date(Date.now() - minutes * 60 * 1000);
    return this.prisma.auditLog.count({
      where: {
        actorId: userId,
        action: "LOGIN_ATTEMPT",
        entityType: "USER",
        createdAt: { gte: fromDate },
        metadata: {
          path: ["success"],
          equals: false,
        },
      },
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
    for (const criterion of QUALITY_CRITERION_TEMPLATES) {
      await this.prisma.qualityRule.upsert({
        where: { code: criterion.code },
        update: {
          kind: QualityRuleKind.CRITERION,
          name: criterion.name,
          description: criterion.description,
          weight: criterion.weight,
          defaultSeverity: null,
          isActive: true,
        },
        create: {
          ...criterion,
          kind: QualityRuleKind.CRITERION,
        },
      });
    }

    for (const violation of VIOLATION_DICTIONARY_TEMPLATES) {
      await this.prisma.qualityRule.upsert({
        where: { code: violation.code },
        update: {
          kind: QualityRuleKind.VIOLATION,
          name: violation.name,
          description: violation.description,
          weight: null,
          defaultSeverity: violation.defaultSeverity,
          isActive: true,
        },
        create: {
          ...violation,
          kind: QualityRuleKind.VIOLATION,
        },
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

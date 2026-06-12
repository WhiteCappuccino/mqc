import { Injectable, NotFoundException } from "@nestjs/common";
import { MediaStatus, QualityRuleKind, Role } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { JwtPayload } from "../auth/jwt-payload.interface";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { ListAuditLogQueryDto } from "./dto/list-audit-log-query.dto";
import { UpdateMediaStatusDto } from "./dto/update-media-status.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { UpsertQualityCriterionDto } from "./dto/upsert-quality-criterion.dto";
import { UpsertSystemSettingDto } from "./dto/upsert-system-setting.dto";
import { UpsertViolationDictionaryDto } from "./dto/upsert-violation-dictionary.dto";

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  listUsers() {
    return this.usersService.listUsers();
  }

  async updateUserRole(userId: string, dto: UpdateUserRoleDto, actor: JwtPayload) {
    const updated = await this.usersService.updateUserRole(userId, dto.role);
    await this.auditService.log({
      actorId: actor.sub,
      action: "ADMIN_UPDATE_USER_ROLE",
      entityType: "USER",
      entityId: userId,
      metadata: { role: dto.role },
    });
    return updated;
  }

  async updateUserStatus(userId: string, dto: UpdateUserStatusDto, actor: JwtPayload) {
    const updated = await this.usersService.setUserActive(userId, dto.isActive);
    await this.auditService.log({
      actorId: actor.sub,
      action: "ADMIN_UPDATE_USER_STATUS",
      entityType: "USER",
      entityId: userId,
      metadata: { isActive: dto.isActive },
    });
    return updated;
  }

  listQualityCriteria() {
    return this.prisma.qualityRule.findMany({
      where: { kind: QualityRuleKind.CRITERION },
      orderBy: { code: "asc" },
    });
  }

  async upsertQualityCriterion(dto: UpsertQualityCriterionDto, actor: JwtPayload) {
    const criterion = await this.prisma.qualityRule.upsert({
      where: { code: dto.code.toUpperCase() },
      update: {
        kind: QualityRuleKind.CRITERION,
        name: dto.name,
        description: dto.description,
        weight: dto.weight ?? 1,
        defaultSeverity: null,
        isActive: dto.isActive ?? true,
      },
      create: {
        kind: QualityRuleKind.CRITERION,
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        weight: dto.weight ?? 1,
        isActive: dto.isActive ?? true,
      },
    });
    await this.auditService.log({
      actorId: actor.sub,
      action: "ADMIN_UPSERT_CRITERION",
      entityType: "QUALITY_CRITERION",
      entityId: criterion.id,
      metadata: { code: criterion.code },
    });
    return criterion;
  }

  listViolationDictionary() {
    return this.prisma.qualityRule.findMany({
      where: { kind: QualityRuleKind.VIOLATION },
      orderBy: { code: "asc" },
    });
  }

  async upsertViolationDictionary(dto: UpsertViolationDictionaryDto, actor: JwtPayload) {
    const entry = await this.prisma.qualityRule.upsert({
      where: { code: dto.code.toUpperCase() },
      update: {
        kind: QualityRuleKind.VIOLATION,
        name: dto.name,
        description: dto.description,
        weight: null,
        defaultSeverity: dto.defaultSeverity,
        isActive: dto.isActive ?? true,
      },
      create: {
        kind: QualityRuleKind.VIOLATION,
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        defaultSeverity: dto.defaultSeverity,
        isActive: dto.isActive ?? true,
      },
    });
    await this.auditService.log({
      actorId: actor.sub,
      action: "ADMIN_UPSERT_VIOLATION_DICTIONARY",
      entityType: "VIOLATION_DICTIONARY",
      entityId: entry.id,
      metadata: { code: entry.code },
    });
    return entry;
  }

  listSystemSettings() {
    return this.prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
    });
  }

  async upsertSystemSetting(dto: UpsertSystemSettingDto, actor: JwtPayload) {
    const setting = await this.prisma.systemSetting.upsert({
      where: { key: dto.key },
      update: {
        value: dto.value,
        description: dto.description,
        updatedById: actor.sub,
      },
      create: {
        key: dto.key,
        value: dto.value,
        description: dto.description,
        updatedById: actor.sub,
      },
    });
    await this.auditService.log({
      actorId: actor.sub,
      action: "ADMIN_UPSERT_SYSTEM_SETTING",
      entityType: "SYSTEM_SETTING",
      entityId: setting.id,
      metadata: { key: setting.key },
    });
    return setting;
  }

  listAuditLogs(query: ListAuditLogQueryDto) {
    return this.prisma.auditLog.findMany({
      where: {
        actorId: query.actorId,
        action: query.action
          ? {
              contains: query.action,
              mode: "insensitive",
            }
          : undefined,
        entityType: query.entityType
          ? {
              contains: query.entityType,
              mode: "insensitive",
            }
          : undefined,
        createdAt:
          query.dateFrom || query.dateTo
            ? {
                gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
                lte: query.dateTo ? new Date(query.dateTo) : undefined,
              }
            : undefined,
      },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
  }

  async updateMediaStatus(mediaId: string, dto: UpdateMediaStatusDto, actor: JwtPayload) {
    const media = await this.prisma.mediaItem.findUnique({
      where: { id: mediaId },
      select: { id: true, status: true },
    });
    if (!media) throw new NotFoundException("Media not found");

    const updated = await this.prisma.mediaItem.update({
      where: { id: mediaId },
      data: {
        status: dto.status,
        publishedAt: dto.status === MediaStatus.PUBLISHED ? new Date() : undefined,
        archivedAt: dto.status === MediaStatus.ARCHIVED ? new Date() : undefined,
      },
    });
    await this.auditService.log({
      actorId: actor.sub,
      action: "ADMIN_UPDATE_MEDIA_STATUS",
      entityType: "MEDIA",
      entityId: mediaId,
      metadata: {
        from: media.status,
        to: dto.status,
        reason: dto.reason ?? null,
      },
    });
    return updated;
  }

  listRoles() {
    return {
      roles: Object.values(Role),
    };
  }

  async deleteMedia(mediaId: string, actor: JwtPayload) {
    const media = await this.prisma.mediaItem.findUnique({
      where: { id: mediaId },
      select: {
        id: true,
        title: true,
        ownerId: true,
      },
    });
    if (!media) throw new NotFoundException("Media not found");

    await this.prisma.mediaItem.delete({
      where: { id: mediaId },
    });

    await this.notificationsService.notify({
      userId: media.ownerId,
      type: "STATUS_CHANGED",
      title: "Media was removed by administrator",
      message: `Material "${media.title}" was deleted by administrator action.`,
      alsoEmail: true,
    });

    await this.auditService.log({
      actorId: actor.sub,
      action: "ADMIN_DELETE_MEDIA",
      entityType: "MEDIA",
      entityId: media.id,
      metadata: {},
    });

    return { ok: true };
  }
}

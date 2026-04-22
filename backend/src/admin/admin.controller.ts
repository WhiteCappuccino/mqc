import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import type { JwtPayload } from "../auth/jwt-payload.interface";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { AdminService } from "./admin.service";
import { ListAuditLogQueryDto } from "./dto/list-audit-log-query.dto";
import { UpdateMediaStatusDto } from "./dto/update-media-status.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { UpsertQualityCriterionDto } from "./dto/upsert-quality-criterion.dto";
import { UpsertSystemSettingDto } from "./dto/upsert-system-setting.dto";
import { UpsertViolationDictionaryDto } from "./dto/upsert-violation-dictionary.dto";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("users")
  listUsers() {
    return this.adminService.listUsers();
  }

  @Patch("users/:id/role")
  updateUserRole(
    @Param("id") userId: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.adminService.updateUserRole(userId, dto, actor);
  }

  @Patch("users/:id/status")
  updateUserStatus(
    @Param("id") userId: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.adminService.updateUserStatus(userId, dto, actor);
  }

  @Get("roles")
  listRoles() {
    return this.adminService.listRoles();
  }

  @Get("criteria")
  listCriteria() {
    return this.adminService.listQualityCriteria();
  }

  @Post("criteria")
  upsertCriterion(
    @Body() dto: UpsertQualityCriterionDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.adminService.upsertQualityCriterion(dto, actor);
  }

  @Get("violations/dictionary")
  listViolationDictionary() {
    return this.adminService.listViolationDictionary();
  }

  @Post("violations/dictionary")
  upsertViolationDictionary(
    @Body() dto: UpsertViolationDictionaryDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.adminService.upsertViolationDictionary(dto, actor);
  }

  @Get("settings")
  listSystemSettings() {
    return this.adminService.listSystemSettings();
  }

  @Post("settings")
  upsertSystemSetting(
    @Body() dto: UpsertSystemSettingDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.adminService.upsertSystemSetting(dto, actor);
  }

  @Get("audit-logs")
  listAuditLogs(@Query() query: ListAuditLogQueryDto) {
    return this.adminService.listAuditLogs(query);
  }

  @Patch("media/:id/status")
  updateMediaStatus(
    @Param("id") mediaId: string,
    @Body() dto: UpdateMediaStatusDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.adminService.updateMediaStatus(mediaId, dto, actor);
  }

  @Delete("media/:id")
  deleteMedia(
    @Param("id") mediaId: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.adminService.deleteMedia(mediaId, actor);
  }
}

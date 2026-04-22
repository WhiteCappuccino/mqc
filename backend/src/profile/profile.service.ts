import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { UsersService } from "../users/users.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class ProfileService {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  getProfile(userId: string) {
    return this.usersService.getProfile(userId);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.usersService.updateProfile(userId, dto);
    await this.auditService.log({
      actorId: userId,
      action: "UPDATE_PROFILE",
      entityType: "USER",
      entityId: userId,
      metadata: { ...dto },
    });
    return profile;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    await this.usersService.changePassword(userId, dto.currentPassword, dto.newPassword);
    await this.auditService.log({
      actorId: userId,
      action: "CHANGE_PASSWORD",
      entityType: "USER",
      entityId: userId,
      metadata: {},
    });
    return { ok: true };
  }

  getHistory(userId: string) {
    return this.usersService.getOwnHistory(userId);
  }
}

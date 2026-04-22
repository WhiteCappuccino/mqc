import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import type { JwtPayload } from "../auth/jwt-payload.interface";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ProfileService } from "./profile.service";

@ApiTags("profile")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.profileService.getProfile(user.sub);
  }

  @Patch()
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(user.sub, dto);
  }

  @Patch("password")
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.profileService.changePassword(user.sub, dto);
  }

  @Get("history")
  history(@CurrentUser() user: JwtPayload) {
    return this.profileService.getHistory(user.sub);
  }
}

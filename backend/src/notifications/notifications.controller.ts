import { Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import type { JwtPayload } from "../auth/jwt-payload.interface";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.listForUser(user.sub);
  }

  @Patch(":id/read")
  markAsRead(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.notificationsService.markAsRead(user.sub, id);
  }
}

import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import type { JwtPayload } from "../auth/jwt-payload.interface";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ModerationDecisionDto } from "./dto/moderation-decision.dto";
import { ModerationService } from "./moderation.service";

@ApiTags("moderation")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MODERATOR, Role.ADMIN)
@Controller("moderation")
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get("queue")
  queue() {
    return this.moderationService.listQueue();
  }

  @Post(":mediaId/decision")
  decide(
    @Param("mediaId") mediaId: string,
    @Body() dto: ModerationDecisionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.moderationService.submitDecision(mediaId, dto, user);
  }

  @Get("violations")
  listViolations() {
    return this.moderationService.listViolationHistory();
  }

  @Post(":mediaId/violations")
  addManualViolation(
    @Param("mediaId") mediaId: string,
    @Body()
    body: {
      type: string;
      description: string;
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      marker?: string;
      coordinates?: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.moderationService.addManualViolation(mediaId, body, user);
  }

  @Patch("violations/:violationId/false-positive")
  markFalsePositive(
    @Param("violationId") violationId: string,
    @Body() body: { isFalsePositive: boolean },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.moderationService.markViolationFalsePositive(
      violationId,
      body.isFalsePositive,
      user,
    );
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { JwtPayload } from "../auth/jwt-payload.interface";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CommentsService } from "./comments.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { ResolveCommentDto } from "./dto/resolve-comment.dto";

@ApiTags("comments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("comments")
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get("media/:mediaId")
  listByMedia(@Param("mediaId") mediaId: string, @CurrentUser() user: JwtPayload) {
    return this.commentsService.listByMedia(mediaId, user);
  }

  @Post()
  create(@Body() dto: CreateCommentDto, @CurrentUser() user: JwtPayload) {
    return this.commentsService.create(dto, user);
  }

  @Patch(":id/resolve")
  resolve(
    @Param("id") id: string,
    @Body() dto: ResolveCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commentsService.resolve(id, dto.isResolved ?? true, user);
  }
}

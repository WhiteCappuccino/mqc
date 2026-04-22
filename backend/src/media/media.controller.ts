import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AccessLevel } from "@prisma/client";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import multer from "multer";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import type { JwtPayload } from "../auth/jwt-payload.interface";
import { ListMediaQueryDto } from "./dto/list-media-query.dto";
import { UploadMediaDto } from "./dto/upload-media.dto";
import { MediaService } from "./media.service";

@ApiTags("media")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListMediaQueryDto) {
    return this.mediaService.list(user, query);
  }

  @Get(":id")
  getById(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.mediaService.getById(id, user);
  }

  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        category: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        type: {
          type: "string",
          enum: ["IMAGE", "VIDEO", "AUDIO", "TEXT", "MIXED"],
        },
        file: { type: "string", format: "binary" },
      },
      required: ["title", "file"],
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: multer.memoryStorage(),
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadMediaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.mediaService.upload(body, file, user);
  }

  @Post(":id/send-for-check")
  sendForCheck(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.mediaService.sendToAutomaticCheck(id, user);
  }

  @Post(":id/analyze")
  analyzeLegacy(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.mediaService.sendToAutomaticCheck(id, user);
  }

  @Post(":id/access")
  grantAccess(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { email: string; level: AccessLevel },
  ) {
    return this.mediaService.grantAccess(id, user, body);
  }

  @Delete(":id/access/:userId")
  revokeAccess(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.mediaService.revokeAccess(id, user, userId);
  }
}

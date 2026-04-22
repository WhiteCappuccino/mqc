import {
  Body,
  Controller,
  Delete,
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
import { AddCollectionItemDto } from "./dto/add-collection-item.dto";
import { CreateCollectionDto } from "./dto/create-collection.dto";
import { ShareCollectionDto } from "./dto/share-collection.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";
import { CollectionsService } from "./collections.service";

@ApiTags("collections")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("collections")
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.collectionsService.list(user);
  }

  @Get(":id")
  getById(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.collectionsService.getById(id, user);
  }

  @Post()
  create(@Body() dto: CreateCollectionDto, @CurrentUser() user: JwtPayload) {
    return this.collectionsService.create(dto, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateCollectionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.collectionsService.update(id, dto, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.collectionsService.remove(id, user);
  }

  @Post(":id/items")
  addItem(
    @Param("id") id: string,
    @Body() dto: AddCollectionItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.collectionsService.addItem(id, dto, user);
  }

  @Delete(":id/items/:mediaItemId")
  removeItem(
    @Param("id") id: string,
    @Param("mediaItemId") mediaItemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.collectionsService.removeItem(id, mediaItemId, user);
  }

  @Post(":id/collaborators")
  share(
    @Param("id") id: string,
    @Body() dto: ShareCollectionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.collectionsService.share(id, dto, user);
  }

  @Delete(":id/collaborators/:userId")
  removeCollaborator(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.collectionsService.removeCollaborator(id, userId, user);
  }
}

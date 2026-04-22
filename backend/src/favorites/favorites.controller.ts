import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { JwtPayload } from "../auth/jwt-payload.interface";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { FavoritesService } from "./favorites.service";

@ApiTags("favorites")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("favorites")
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.favoritesService.list(user);
  }

  @Post(":mediaId")
  add(@Param("mediaId") mediaId: string, @CurrentUser() user: JwtPayload) {
    return this.favoritesService.add(mediaId, user);
  }

  @Delete(":mediaId")
  remove(@Param("mediaId") mediaId: string, @CurrentUser() user: JwtPayload) {
    return this.favoritesService.remove(mediaId, user);
  }
}

import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class ResolveCommentDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isResolved?: boolean;
}


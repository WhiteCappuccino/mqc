import { ApiPropertyOptional } from "@nestjs/swagger";
import { MediaStatus, MediaType, ViolationSeverity } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class ListMediaQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: MediaType })
  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;

  @ApiPropertyOptional({ enum: MediaStatus })
  @IsOptional()
  @IsEnum(MediaStatus)
  status?: MediaStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({ enum: ViolationSeverity })
  @IsOptional()
  @IsEnum(ViolationSeverity)
  severity?: ViolationSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    enum: ["createdAt", "quality", "popularity", "status"],
  })
  @IsOptional()
  @IsString()
  sortBy?: "createdAt" | "quality" | "popularity" | "status";
}

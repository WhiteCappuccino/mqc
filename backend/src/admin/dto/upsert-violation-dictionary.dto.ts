import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ViolationSeverity } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class UpsertViolationDictionaryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  code!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: ViolationSeverity })
  @IsEnum(ViolationSeverity)
  defaultSeverity!: ViolationSeverity;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}


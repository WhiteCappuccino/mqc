import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ModerationStatus } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class ModerationDecisionDto {
  @ApiProperty({ enum: ModerationStatus })
  @IsEnum(ModerationStatus)
  status!: ModerationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  qualityLevel?: number;
}

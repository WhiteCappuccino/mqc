import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  text!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qualityCheckId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  violationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;
}


import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MediaType } from "@prisma/client";
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UploadMediaDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: MediaType })
  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

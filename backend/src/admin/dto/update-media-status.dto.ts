import { ApiProperty } from "@nestjs/swagger";
import { MediaStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateMediaStatusDto {
  @ApiProperty({ enum: MediaStatus })
  @IsEnum(MediaStatus)
  status!: MediaStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}


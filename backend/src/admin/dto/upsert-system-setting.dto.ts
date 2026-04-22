import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpsertSystemSettingDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  key!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  value!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}


import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { MediaType } from "@prisma/client";

class RenderRuleDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  fileNamePattern!: string;

  @IsEnum(MediaType)
  mediaType!: MediaType;

  @IsOptional()
  @IsString()
  expectedContainer?: string;

  @IsOptional()
  @IsString()
  expectedVideoCodec?: string;

  @IsOptional()
  @IsString()
  expectedAudioCodec?: string;

  @IsOptional()
  @IsString()
  expectedWidth?: string;

  @IsOptional()
  @IsString()
  expectedHeight?: string;

  @IsOptional()
  @IsString()
  expectedFps?: string;

  @IsOptional()
  @IsString()
  expectedBitrateKbps?: string;

  @IsOptional()
  @IsString()
  expectedMinDurationSec?: string;

  @IsOptional()
  @IsString()
  expectedMaxDurationSec?: string;
}

class ProfileRequirementsDto {
  @IsOptional()
  @IsString()
  maxFileSizeMb?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedContainers?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedVideoCodecs?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedAudioCodecs?: string[];

  @IsOptional()
  @IsString()
  expectedFps?: string;

  @IsOptional()
  @IsString()
  expectedMinBitrateKbps?: string;

  @IsOptional()
  @IsString()
  expectedMaxBitrateKbps?: string;

  @IsOptional()
  @IsBoolean()
  requireAudio?: boolean;
}

export class SendForCheckDto {
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  criteriaCodes?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileRequirementsDto)
  profileRequirements?: ProfileRequirementsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RenderRuleDto)
  renderRules?: RenderRuleDto[];
}

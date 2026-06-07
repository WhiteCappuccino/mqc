import { IsArray, IsOptional, IsString } from "class-validator";

export class SendForCheckDto {
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  criteriaCodes?: string[];
}

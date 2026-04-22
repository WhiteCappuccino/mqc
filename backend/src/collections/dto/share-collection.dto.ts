import { ApiProperty } from "@nestjs/swagger";
import { AccessLevel } from "@prisma/client";
import { IsEmail, IsEnum } from "class-validator";

export class ShareCollectionDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: AccessLevel })
  @IsEnum(AccessLevel)
  level!: AccessLevel;
}


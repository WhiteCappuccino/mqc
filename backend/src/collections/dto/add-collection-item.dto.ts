import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class AddCollectionItemDto {
  @ApiProperty()
  @IsString()
  mediaItemId!: string;
}


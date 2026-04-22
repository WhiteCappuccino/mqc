import { ApiProperty } from "@nestjs/swagger";
import { Role } from "@prisma/client";

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty()
  emailVerified!: boolean;
}

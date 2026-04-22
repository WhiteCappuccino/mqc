import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: "username may include letters, digits and _.-",
  })
  username!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      "password must contain at least one lowercase, uppercase letter and digit",
  })
  password!: string;
}

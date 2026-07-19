import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { AuthProvider } from "@shared/enums";

export class RegisterDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(8) password!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() firstName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() lastName?: string;
}

export class LoginDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() password!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() device?: string;
}

export class ForgotPasswordDto {
  @ApiProperty() @IsEmail() email!: string;
}

export class ResetPasswordDto {
  @ApiProperty() @IsString() token!: string;
  @ApiProperty() @IsString() @MinLength(8) password!: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() current!: string;
  @ApiProperty() @IsString() @MinLength(8) next!: string;
}

export class RefreshDto {
  @ApiProperty() @IsString() refreshToken!: string;
}

export class TwoFactorVerifyDto {
  @ApiProperty() @IsString() userId!: string;
  @ApiProperty() @IsString() code!: string;
}

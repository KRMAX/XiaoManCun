import { Body, Controller, Post } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /api/auth/login  微信 code 换 token */
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<{ token: string; playerId: string }> {
    return this.auth.loginByCode(dto.code);
  }
}

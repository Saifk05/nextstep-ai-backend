import { Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.register(req.body);

    return res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  }

  @Post('login')
  async login(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.login(req.body);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.logout(req.body);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  }

  @Post('refresh-token')
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.refreshToken(req.body);

    return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
    });
  }
}
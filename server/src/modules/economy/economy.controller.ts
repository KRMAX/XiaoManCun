import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsInt, Min } from 'class-validator';
import { AuthGuard } from '../../common/auth.guard';
import { CurrentPlayer } from '../../common/current-player.decorator';
import { EconomyService } from './economy.service';

class OfflineDto {
  @IsInt()
  @Min(0)
  lastOfflineAt!: number;
}

@Controller('economy')
@UseGuards(AuthGuard)
export class EconomyController {
  constructor(private readonly economy: EconomyService) {}

  /** GET /api/economy/time  服务端权威时间 */
  @Get('time')
  time(): { now: number } {
    return { now: this.economy.now() };
  }

  /** POST /api/economy/offline  离线收益结算（封顶） */
  @Post('offline')
  offline(@CurrentPlayer() playerId: string, @Body() dto: OfflineDto): { offlineHours: number; cappedHours: number } {
    return this.economy.settleOffline(playerId, dto.lastOfflineAt);
  }
}

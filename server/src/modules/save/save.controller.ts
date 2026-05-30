import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsObject, Min } from 'class-validator';
import { AuthGuard } from '../../common/auth.guard';
import { CurrentPlayer } from '../../common/current-player.decorator';
import { SaveService } from './save.service';
import { PlayerSave } from '../../infra/store.service';

class SaveDto {
  @IsInt()
  @Min(0)
  baseVersion!: number;

  @IsObject()
  blob!: Record<string, unknown>;
}

@Controller('save')
@UseGuards(AuthGuard)
export class SaveController {
  constructor(private readonly save: SaveService) {}

  /** GET /api/save  拉取当前玩家存档 */
  @Get()
  load(@CurrentPlayer() playerId: string): PlayerSave {
    return this.save.load(playerId);
  }

  /** POST /api/save  写存档（带版本号乐观锁） */
  @Post()
  store(@CurrentPlayer() playerId: string, @Body() dto: SaveDto): PlayerSave {
    return this.save.save(playerId, dto.baseVersion, dto.blob);
  }
}

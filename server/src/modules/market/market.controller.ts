import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsString, IsNotEmpty, Min } from 'class-validator';
import { AuthGuard } from '../../common/auth.guard';
import { CurrentPlayer } from '../../common/current-player.decorator';
import { MarketService } from './market.service';

class ListDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsInt()
  @Min(1)
  price!: number;

  @IsInt()
  @Min(1)
  count!: number;
}

class BuyFriendDto {
  @IsString()
  @IsNotEmpty()
  friendId!: string;

  @IsString()
  @IsNotEmpty()
  listingId!: string;
}

@Controller('market')
@UseGuards(AuthGuard)
export class MarketController {
  constructor(private readonly market: MarketService) {}

  /** POST /api/market/list  上架商品（对应客户端 MarketSystem.listGoods） */
  @Post('list')
  list(@CurrentPlayer() playerId: string, @Body() dto: ListDto): Promise<{ listingId: string }> {
    return this.market.list(playerId, dto.itemId, dto.price, dto.count);
  }

  /** POST /api/market/buy_friend  购买好友摊位商品（对应客户端 MarketSystem.buyFromFriend） */
  @Post('buy_friend')
  buyFriend(@CurrentPlayer() playerId: string, @Body() dto: BuyFriendDto): Promise<{ ok: boolean; paid: number }> {
    return this.market.buyFromFriend(playerId, dto.listingId);
  }

  /** GET /api/market/leaderboard  集市周榜 */
  @Get('leaderboard')
  leaderboard(@Query('top') top?: string): Promise<Array<{ member: string; score: number }>> {
    return this.market.leaderboard(top ? Number(top) : 50);
  }
}

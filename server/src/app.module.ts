import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InfraModule } from './infra/infra.module';
import { AuthModule } from './modules/auth/auth.module';
import { SaveModule } from './modules/save/save.module';
import { EconomyModule } from './modules/economy/economy.module';
import { MarketModule } from './modules/market/market.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    InfraModule,
    AuthModule,
    SaveModule,
    EconomyModule,
    MarketModule,
  ],
})
export class AppModule {}

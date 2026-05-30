import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EconomyController } from './economy.controller';
import { EconomyService } from './economy.service';

@Module({
  imports: [AuthModule],
  controllers: [EconomyController],
  providers: [EconomyService],
  exports: [EconomyService],
})
export class EconomyModule {}

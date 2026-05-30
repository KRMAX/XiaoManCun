import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SaveController } from './save.controller';
import { SaveService } from './save.service';

@Module({
  imports: [AuthModule],
  controllers: [SaveController],
  providers: [SaveService],
})
export class SaveModule {}

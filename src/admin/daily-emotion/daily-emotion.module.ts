import { Module } from '@nestjs/common';
import { DailyEmotionService } from './daily-emotion.service';
import { DailyEmotionResolver } from './daily-emotion.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyEmotion } from 'src/daily-emotion/entities/daily-emotion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DailyEmotion])],
  providers: [DailyEmotionResolver, DailyEmotionService],
})
export class DailyEmotionModule {}

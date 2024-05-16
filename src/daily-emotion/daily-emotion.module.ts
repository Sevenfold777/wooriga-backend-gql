import { Module } from '@nestjs/common';
import { DailyEmotionService } from './daily-emotion.service';
import { DailyEmotionResolver } from './daily-emotion.resolver';

@Module({
  providers: [DailyEmotionResolver, DailyEmotionService],
})
export class DailyEmotionModule {}

import { Module } from '@nestjs/common';
import { DailyEmotionService } from './daily-emotion.service';
import { DailyEmotionResolver } from './daily-emotion.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyEmotion } from 'src/daily-emotion/entities/daily-emotion.entity';
import { DailyEmotionServiceImpl } from './daily-emotion.service.impl';

@Module({
  imports: [TypeOrmModule.forFeature([DailyEmotion])],
  providers: [
    DailyEmotionResolver,
    { provide: DailyEmotionService, useClass: DailyEmotionServiceImpl },
  ],
})
export class DailyEmotionModule {}

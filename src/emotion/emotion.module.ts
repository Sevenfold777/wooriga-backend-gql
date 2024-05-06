import { Module } from '@nestjs/common';
import { EmotionService } from './emotion.service';
import { EmotionResolver } from './emotion.resolver';

@Module({
  providers: [EmotionResolver, EmotionService],
})
export class EmotionModule {}

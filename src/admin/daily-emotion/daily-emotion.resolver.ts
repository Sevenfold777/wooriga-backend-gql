import { Query, Resolver } from '@nestjs/graphql';
import { DailyEmotionService } from './daily-emotion.service';
import { CountResDTO } from '../dto/count-res.dto';
import { DailyEmotion } from 'src/daily-emotion/entities/daily-emotion.entity';
import { Inject } from '@nestjs/common';

@Resolver(() => DailyEmotion)
export class DailyEmotionResolver {
  constructor(
    @Inject(DailyEmotionService)
    private readonly dailyEmotionService: DailyEmotionService,
  ) {}

  @Query(() => CountResDTO)
  getEmotionCreateCount(): Promise<CountResDTO> {
    return this.dailyEmotionService.getEmotionCreateCount();
  }
}

import { Resolver } from '@nestjs/graphql';
import { EmotionService } from './emotion.service';

@Resolver()
export class EmotionResolver {
  constructor(private readonly emotionService: EmotionService) {}
}

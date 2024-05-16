import { ObjectType, Int, Field } from '@nestjs/graphql';
import { DailyEmotionType } from '../constants/daily-emotion-type.enum';

@ObjectType()
export class EmotionWithUserId {
  @Field(() => Int)
  userId: number;

  @Field(() => DailyEmotionType)
  type: DailyEmotionType;
}

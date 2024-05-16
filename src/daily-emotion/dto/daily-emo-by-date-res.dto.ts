import { Field, ObjectType } from '@nestjs/graphql';
import { EmotionWithUserId } from './emotion-with-userId-req.dto';

@ObjectType()
export class DailyEmoByDateResDTO {
  @Field(() => Date)
  date: Date;

  @Field(() => EmotionWithUserId)
  emotions: EmotionWithUserId[];
}

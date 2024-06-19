import { Field, Int, ObjectType } from '@nestjs/graphql';
import { User } from 'src/user/entities/user.entity';

@ObjectType()
export class UserWithStat extends User {
  @Field(() => Int)
  messageCommentCount: number;

  @Field(() => Int)
  letterSentCount: number;

  @Field(() => Int)
  photoCount: number;

  @Field(() => Int)
  photoCommentCount: number;

  @Field(() => Int)
  emotionCount: number;
}

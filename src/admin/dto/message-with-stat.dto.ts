import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Message } from 'src/message/entities/message.entity';

@ObjectType()
export class MessageWithStat extends Message {
  @Field(() => Int)
  sentCount: number;

  @Field(() => Int)
  commentsCount: number;

  @Field(() => Int)
  commentAuthorsCount: number;

  @Field(() => Int)
  keepsCount: number;
}

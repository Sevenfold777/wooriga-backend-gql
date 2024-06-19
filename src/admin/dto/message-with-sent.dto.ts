import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Message } from 'src/message/entities/message.entity';

@ObjectType()
export class MessageWithSent extends Message {
  @Field(() => Int)
  sentCount: number;
}

import { Field, Int, ObjectType } from '@nestjs/graphql';
import { LinkableService } from '../constants/message-linkable-service.enum';
import { MessageEmotionType } from '../constants/message-emotion-type.enum';

@ObjectType()
export class MsgResDTO {
  @Field(() => Int)
  messageFamId: number;

  @Field()
  payload: string;

  @Field(() => MessageEmotionType)
  emotion: MessageEmotionType;

  @Field(() => Date)
  receiveDate: Date;

  @Field(() => Int)
  commentsCount: number;

  @Field(() => Boolean)
  isKept: boolean;

  @Field(() => LinkableService, { nullable: true })
  linkTo?: LinkableService;
}

import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class MsgCommentReqDTO {
  @Field(() => Int)
  messageFamId: number;

  @Field(() => Int)
  prev: number;
}

import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

@InputType()
export class CreateMsgCommentReqDTO {
  @Field(() => Int)
  @IsNumber()
  messageFamId: number;

  @Field()
  @IsNotEmpty()
  @IsString()
  payload: string;
}

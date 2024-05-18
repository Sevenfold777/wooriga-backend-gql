import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNumber } from 'class-validator';

@InputType()
export class PhotoCommentReqDTO {
  @Field(() => Int)
  @IsNumber()
  photoId: number;

  @Field(() => Int)
  @IsNumber()
  prev: number;
}

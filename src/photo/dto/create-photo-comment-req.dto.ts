import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

@InputType()
export class CreatePhotoCommentReqDTO {
  @Field(() => Int)
  @IsNumber()
  photoId: number;

  @Field()
  @IsNotEmpty()
  @IsString()
  payload: string;
}

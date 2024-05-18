import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class CreatePhotoReqDTO {
  @Field()
  @IsNotEmpty()
  @IsString()
  theme: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  payload: string;
}

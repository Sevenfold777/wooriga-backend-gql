import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

@InputType()
export class PhotoFileUploaded {
  @Field()
  @IsNotEmpty()
  @IsString()
  url: string;

  @Field(() => Int)
  @IsNumber()
  width: number;

  @Field(() => Int)
  @IsNumber()
  height: number;
}

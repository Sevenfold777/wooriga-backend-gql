import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

@ArgsType()
export class CreatePhotoReqDTO {
  @Field()
  @IsNotEmpty()
  @IsString()
  title: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  payload: string;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  @Max(10)
  filesCount: number;
}

import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsNumber, IsNotEmpty, IsString } from 'class-validator';

@ArgsType()
export class ProfilePhotoUploadCompletedReqDTO {
  @Field(() => Int)
  @IsNumber()
  pediaId: number;

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

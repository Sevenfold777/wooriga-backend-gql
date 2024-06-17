import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

@ArgsType()
export class PhotoFileUploadCompletedReqDTO {
  @Field(() => Int)
  @IsNumber()
  photoId: number;

  @Field(() => [String])
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  urls: string[];
}

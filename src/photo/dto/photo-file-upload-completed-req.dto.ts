import { ArgsType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

@ArgsType()
export class PhotoFileUploadCompletedReqDTO {
  @IsNumber()
  photoId: number;

  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  urls: string[];
}

import { ArgsType } from '@nestjs/graphql';
import { IsNumber, IsNotEmpty, IsString } from 'class-validator';

@ArgsType()
export class ProfilePhotoUploadCompletedReqDTO {
  @IsNumber()
  pediaId: number;

  @IsNotEmpty()
  @IsString()
  url: string;
}

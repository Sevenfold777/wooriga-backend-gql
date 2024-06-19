import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsNumber, ValidateNested } from 'class-validator';
import { PhotoFileUploaded } from './photo-file-uploaded.dto';
import { Type } from 'class-transformer';

@ArgsType()
export class PhotoFileUploadCompletedReqDTO {
  @Field(() => Int)
  @IsNumber()
  photoId: number;

  @Field(() => [PhotoFileUploaded])
  @ValidateNested({ each: true })
  @Type(() => PhotoFileUploaded)
  photofilesUploaded: PhotoFileUploaded[];
}

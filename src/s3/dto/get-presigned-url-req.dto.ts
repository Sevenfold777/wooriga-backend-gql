import { IsEnum, IsNumber } from 'class-validator';
import { S3Directory } from '../constants/s3-directory.enum';

export class GetPresignedUrlReqDTO {
  @IsNumber()
  userId: number;

  @IsEnum(S3Directory)
  dir: S3Directory;

  @IsNumber()
  fileId: number;

  @IsNumber()
  expiresIn: number; // in seconds
}

import { GetPresignedUrlResDTO } from './dto/get-presigned-url-res.dto';
import { GetPresignedUrlReqDTO } from './dto/get-presigned-url-req.dto';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';

export interface S3Service {
  getPresignedUrl(
    getPresignedUrlReqDTO: GetPresignedUrlReqDTO,
  ): Promise<GetPresignedUrlResDTO>;

  deleteFile(key: string): Promise<BaseResponseDTO>;

  deleteFiles(keys: string[]): Promise<BaseResponseDTO>;
}

export const S3Service = Symbol('S3Service');

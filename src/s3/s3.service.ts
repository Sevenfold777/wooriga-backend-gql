import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { GetPresignedUrlResDTO } from './dto/get-presigned-url-res.dto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AuthService } from 'src/auth/auth.service';
import { GetPresignedUrlReqDTO } from './dto/get-presigned-url-req.dto';
import { CustomValidate } from 'src/common/utils/custom-validate.decorator';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';

@Injectable()
export class S3Service {
  private s3Client: S3Client;

  constructor(private readonly authService: AuthService) {
    this.s3Client = new S3Client({
      credentials: {
        accessKeyId: process.env.AWS_S3_UPLOADER_ACCESS_KEY,
        secretAccessKey: process.env.AWS_S3_UPLOADER_SECRET_KEY,
      },
      region: process.env.AWS_DEFAULT_REGION,
    });
  }

  @CustomValidate(GetPresignedUrlResDTO)
  async getPresignedUrl({
    userId,
    dir,
    fileId,
    expiresIn,
  }: GetPresignedUrlReqDTO): Promise<GetPresignedUrlResDTO> {
    try {
      const encryptedUserId = await this.authService.encrypt({
        target: String(userId),
      });

      const fileName = String(Date.now()) + `file:${fileId}`;

      const encryptedFileName = await this.authService.encrypt({
        target: fileName,
      });

      const objectName = `${dir}/${encryptedUserId}/${encryptedFileName}.jpeg`;

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: objectName,
        ACL: 'public-read',
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return { result: true, url: presignedUrl };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async deleteFile(key: string): Promise<BaseResponseDTO> {
    // 엔드포인트만 넘겨 받는 게 규약이지만, 앱단에서 실수할 가능성 높기에 이중 필터
    const strippedKey = key.replace(/^\.com\//, '').split('?')[0];

    try {
      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: strippedKey,
      });

      await this.s3Client.send(command);

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }
}

import { BaseResponseDTO } from 'src/common/dto/base-res.dto';

export class GetPresignedUrlResDTO extends BaseResponseDTO {
  url?: string;
}

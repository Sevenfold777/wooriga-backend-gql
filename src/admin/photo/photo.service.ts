import { CountResDTO } from '../dto/count-res.dto';

export interface PhotoService {
  getPhotoCreateCount(): Promise<CountResDTO>;

  getPhotoCommentCreateCount(): Promise<CountResDTO>;
}

export const PhotoService = Symbol('PhotoService');

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PhotoComment } from 'src/photo/entities/photo-comment.entity';
import { Photo } from 'src/photo/entities/photo.entity';
import { Repository } from 'typeorm';
import { CountResDTO } from '../dto/count-res.dto';
import { PhotoService } from './photo.service';

@Injectable()
export class PhotoServiceImpl implements PhotoService {
  constructor(
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    @InjectRepository(PhotoComment)
    private readonly photoCommentRepository: Repository<PhotoComment>,
  ) {}

  async getPhotoCreateCount(): Promise<CountResDTO> {
    try {
      const todayBegin = new Date(new Date().toLocaleDateString('ko-KR'));

      const photosTodayCount = await this.photoRepository
        .createQueryBuilder('photo')
        .where('photo.createdAt >= :todayBegin', { todayBegin })
        .getCount();

      return { result: true, count: photosTodayCount };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getPhotoCommentCreateCount(): Promise<CountResDTO> {
    try {
      const todayBegin = new Date(new Date().toLocaleDateString('ko-KR'));

      const photoCommentsTodayCount = await this.photoCommentRepository
        .createQueryBuilder('comment')
        .where('comment.createdAt >= :todayBegin', { todayBegin })
        .getCount();

      return { result: true, count: photoCommentsTodayCount };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }
}

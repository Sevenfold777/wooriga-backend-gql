import { Query, Resolver } from '@nestjs/graphql';
import { PhotoService } from './photo.service';
import { CountResDTO } from '../dto/count-res.dto';
import { Photo } from 'src/photo/entities/photo.entity';

@Resolver(() => Photo)
export class PhotoResolver {
  constructor(private readonly photoService: PhotoService) {}

  @Query(() => CountResDTO)
  getPhotoCreateCount(): Promise<CountResDTO> {
    return this.photoService.getPhotoCreateCount();
  }

  @Query(() => CountResDTO)
  getPhotoCommentCreateCount(): Promise<CountResDTO> {
    return this.photoService.getPhotoCommentCreateCount();
  }
}

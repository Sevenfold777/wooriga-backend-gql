import { Module } from '@nestjs/common';
import { PhotoService } from './photo.service';
import { PhotoResolver } from './photo.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhotoComment } from 'src/photo/entities/photo-comment.entity';
import { Photo } from 'src/photo/entities/photo.entity';
import { PhotoServiceImpl } from './photo.service.impl';

@Module({
  imports: [TypeOrmModule.forFeature([Photo, PhotoComment])],
  providers: [
    PhotoResolver,
    { provide: PhotoService, useClass: PhotoServiceImpl },
  ],
})
export class PhotoModule {}

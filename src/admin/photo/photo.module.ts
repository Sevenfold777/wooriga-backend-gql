import { Module } from '@nestjs/common';
import { PhotoService } from './photo.service';
import { PhotoResolver } from './photo.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhotoComment } from 'src/photo/entities/photo-comment.entity';
import { Photo } from 'src/photo/entities/photo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Photo, PhotoComment])],
  providers: [PhotoResolver, PhotoService],
})
export class PhotoModule {}

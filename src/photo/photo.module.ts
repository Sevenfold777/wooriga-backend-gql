import { Module } from '@nestjs/common';
import { PhotoService } from './photo.service';
import { PhotoResolver } from './photo.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Photo } from './entities/photo.entity';
import { PhotoComment } from './entities/photo-comment.entity';
import { PhotoLike } from './entities/photo-like.entity';
import { PhotoFile } from './entities/photo-file.entity';
import { SqsNotificationModule } from 'src/sqs-notification/sqs-notification.module';
import { S3Module } from 'src/s3/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Photo, PhotoComment, PhotoLike, PhotoFile]),
    SqsNotificationModule,
    S3Module,
  ],
  providers: [PhotoResolver, PhotoService],
})
export class PhotoModule {}

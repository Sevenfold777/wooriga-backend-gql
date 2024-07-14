import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { AuthModule } from 'src/auth/auth.module';
import { S3ServiceImpl } from './s3.service.impl';

@Module({
  imports: [AuthModule],
  providers: [{ provide: S3Service, useClass: S3ServiceImpl }],
  exports: [S3Service],
})
export class S3Module {}

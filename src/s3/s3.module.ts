import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}

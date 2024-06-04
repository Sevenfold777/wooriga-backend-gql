import { Module } from '@nestjs/common';
import { SqsNotificationService } from './sqs-notification.service';

@Module({
  providers: [SqsNotificationService],
  exports: [SqsNotificationService],
})
export class SqsNotificationModule {}

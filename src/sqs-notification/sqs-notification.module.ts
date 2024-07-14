import { SqsNotificationService } from 'src/sqs-notification/sqs-notification.service';
import { Module } from '@nestjs/common';
import { SqsNotificationServiceImpl } from './sqs-notification.service.impl';

@Module({
  providers: [
    {
      provide: SqsNotificationService,
      useClass: SqsNotificationServiceImpl,
    },
    SqsNotificationServiceImpl,
  ],
  exports: [SqsNotificationService, SqsNotificationServiceImpl],
})
export class SqsNotificationModule {}

import { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { SqsNotificationReqDTO } from './dto/sqs-notification-req.dto';
import { NotificationType } from './constants/notification-type';

export interface SqsNotificationService
  extends OnApplicationBootstrap,
    OnModuleDestroy {
  sendNotification(body: SqsNotificationReqDTO<NotificationType>): void;

  receiveNotificationPayload(): void;
}

export const SqsNotificationService = Symbol('SqsNotificationService');

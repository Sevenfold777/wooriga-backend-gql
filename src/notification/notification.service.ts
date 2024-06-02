import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CreateNotificationReqDTO } from './dto/create-notification-req.dto';

@Injectable()
export class NotificationService {
  @OnEvent('sqs.notification.payload.received')
  async handleNotificationStore(
    notifList: CreateNotificationReqDTO[],
  ): Promise<void> {
    // TODO: validation based on class-validator has to be done
    console.log(notifList);
  }
}

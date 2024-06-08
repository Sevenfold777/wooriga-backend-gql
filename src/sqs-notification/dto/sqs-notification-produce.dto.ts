import {
  NotificationParamType,
  NotificationType,
} from '../constants/notification-type';

export class SqsNotificationProduceDTO<T extends NotificationType> {
  type: T;

  param: NotificationParamType[T];

  save?: boolean; // default false

  constructor(type: T, param: NotificationParamType[T], save = false) {
    this.type = type;
    this.param = param;
    this.save = save;
  }
}

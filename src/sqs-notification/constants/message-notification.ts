import { IsNumber } from 'class-validator';
import { NotificationType } from './notification-type';

export type MessageNotifParamType = {
  [NotificationType.MESSAGE_TODAY]: MessageTodayParam;
  [NotificationType.MESSAGE_BIRTHDAY]: MessageBirthdayParam;
  [NotificationType.COMMENT_MESSAGE]: CommentMessageParam;
};

class MessageTodayParam {
  @IsNumber({}, { each: true })
  familyIds: number[];
}

class MessageBirthdayParam {
  @IsNumber({}, { each: true })
  familyIds: number[];
}

class CommentMessageParam {
  @IsNumber()
  messageFamId: number;

  @IsNumber()
  familyId: number;
}

import { Type } from 'class-transformer';
import { IsNumber, ValidateNested } from 'class-validator';
import { NotificationType } from './notification-type';

export type LetterNotifParamType = {
  [NotificationType.LETTER_SEND]: LetterSendParam;
  [NotificationType.TIMECAPSULE_OPENED]: TimeCapsulesOpenedParam;
  [NotificationType.NOTIFY_BIRTHDAY]: NotifyBirthdayParam;
};

class LetterSendParam {
  @IsNumber()
  letterId: number;

  @IsNumber()
  receiverId: number;
}

class TimeCapsulesOpenedParam {
  @ValidateNested({ each: true })
  @Type(() => TimeCapsuleParam)
  timaCapsules: TimeCapsuleParam[];
}

class NotifyBirthdayParam {
  @ValidateNested({ each: true })
  @Type(() => BirthdayUserWithFamilyParam)
  familyIdsWithUserId: BirthdayUserWithFamilyParam[];
}

class BirthdayUserWithFamilyParam {
  @IsNumber()
  familyId: number;

  @IsNumber()
  birthdayUserId: number;
}

class TimeCapsuleParam {
  @IsNumber()
  letterId: number;

  @IsNumber()
  receiverId: number;

  @IsNumber()
  senderId: number;
}

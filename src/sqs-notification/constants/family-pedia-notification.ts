import { IsNumber } from 'class-validator';
import { NotificationType } from './notification-type';

export type FamilyPediaNotifParamType = {
  [NotificationType.PEDIA_QUESTION_CREATED]: PediaQuestionCreatedParam;
  [NotificationType.PEDIA_QUESTION_EDITTED]: PediaQuestionEdittedParam;
  [NotificationType.PEDIA_ANSWER]: PediaAnswerParam;
  [NotificationType.PEDIA_EDIT_PHOTO]: PediaEditPhotoParam;
};

export class PediaQuestionCreatedParam {
  @IsNumber()
  familyId: number;

  @IsNumber()
  ownerId: number;
}

export class PediaQuestionEdittedParam {
  @IsNumber()
  familyId: number;

  @IsNumber()
  ownerId: number;
}

export class PediaAnswerParam {
  @IsNumber()
  familyId: number;

  @IsNumber()
  ownerId: number;
}

export class PediaEditPhotoParam {
  @IsNumber()
  familyId: number;

  @IsNumber()
  ownerId: number;
}

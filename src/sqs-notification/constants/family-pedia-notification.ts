import { IsNumber } from 'class-validator';
import { NotificationType } from './notification-type';

export type FamilyPediaNotifParamType = {
  [NotificationType.PEDIA_QUESTION_CREATED]: PediaQuestionCreatedParam;
  [NotificationType.PEDIA_QUESTION_EDITTED]: PediaQuestionEdittedParam;
  [NotificationType.PEDIA_ANSWER]: PediaAnswerParam;
  [NotificationType.PEDIA_EDIT_PHOTO]: PediaEditPhotoParam;
};

class PediaQuestionCreatedParam {
  @IsNumber()
  ownerId: number;
}

class PediaQuestionEdittedParam {
  @IsNumber()
  ownerId: number;
}

class PediaAnswerParam {
  @IsNumber()
  familyId: number;
}

class PediaEditPhotoParam {
  @IsNumber()
  familyId: number;
}

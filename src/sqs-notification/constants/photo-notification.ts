import { IsNumber } from 'class-validator';
import { NotificationType } from './notification-type';

export type PhotoNotifParamType = {
  [NotificationType.PHOTO_CREATE]: PhotoCreateParam;
  [NotificationType.PHOTO_UPLOADED]: PhotoUploadedParam;
  [NotificationType.COMMENT_PHOTO]: CommentPhotoParam;
};

class PhotoCreateParam {
  @IsNumber()
  photoId: number;

  @IsNumber()
  familyId: number;
}

class PhotoUploadedParam {
  @IsNumber()
  photoId: number;

  @IsNumber()
  userId: number;
}

class CommentPhotoParam {
  @IsNumber()
  photoId: number;

  @IsNumber()
  familyId: number;
}

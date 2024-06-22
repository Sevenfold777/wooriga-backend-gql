import { IsNumber, IsOptional, IsString } from "class-validator";
import { NotificationType } from "./notification-type";

export type PhotoNotifParamType = {
  [NotificationType.PHOTO_CREATE]: PhotoCreateParam;
  [NotificationType.COMMENT_PHOTO]: CommentPhotoParam;
};

export class PhotoCreateParam {
  @IsNumber()
  photoId: number;

  @IsOptional()
  @IsString()
  titlePreview: string;

  @IsNumber()
  authorId: number;

  @IsNumber()
  familyId: number;
}

export class CommentPhotoParam {
  @IsNumber()
  photoId: number;

  @IsOptional()
  @IsString()
  commentPreview: string;

  @IsNumber()
  authorId: number;

  @IsNumber()
  familyId: number;
}

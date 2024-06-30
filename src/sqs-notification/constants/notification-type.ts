import { DailyEmotionNotifParamType } from './daily-emotion-notification';
import { FamilyPediaNotifParamType } from './family-pedia-notification';
import { LetterNotifParamType } from './letter-notification';
import { MessageNotifParamType } from './message-notification';
import { PhotoNotifParamType } from './photo-notification';

/*
 * ParamType과 같이 서비스별 분류 하려고 했으나
 * typescript에서 여러 개의 enum을 합치는 것을 지원하지 않음
 * 여러 개의 enum을 합쳐서 하나의 type을 선언할 수 있지만
 * class-validator 사용시 validation이 지나치게 복잡해짐
 */
export enum NotificationType {
  // message
  MESSAGE_TODAY = 'MESSAGE_TODAY',
  MESSAGE_BIRTHDAY = 'MESSAGE_BIRTHDAY',
  COMMENT_MESSAGE = 'COMMENT_MESSAGE',

  // photo
  PHOTO_CREATE = 'PHOTO_CREATE',
  COMMENT_PHOTO = 'COMMENT_PHOTO',

  // letter
  LETTER_SEND = 'LETTER_SEND',
  TIMECAPSULE_OPEN = 'TIMECAPSULE_OPEN',
  NOTIFY_BIRTHDAY = 'NOTIFY_BIRTHDAY',

  // daily-emotion
  EMOTION_CHOSEN = 'EMOTION_CHOSEN',
  EMOTION_POKE = 'EMOTION_POKE',

  // family-pedia
  PEDIA_QUESTION_CREATED = 'PEDIA_QUESTION_CREATED',
  PEDIA_QUESTION_EDITTED = 'PEDIA_QUESTION_EDITTED',
  PEDIA_ANSWER = 'PEDIA_ANSWER',
  PEDIA_EDIT_PHOTO = 'PEDIA_EDIT_PHOTO',
}

export type NotificationParamType = MessageNotifParamType &
  PhotoNotifParamType &
  DailyEmotionNotifParamType &
  LetterNotifParamType &
  FamilyPediaNotifParamType;

/**
 * /sqs-notification/contants의 다른 파일들에서 export 된 것들은
 * 이 파일 이외의 다른 파일로 import 되지 않도록 관리해야 함.
 * 다른 모듈에서는 이 파일의 타입만을 참조
 */

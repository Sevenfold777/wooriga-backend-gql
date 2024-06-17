import { IsNumber } from 'class-validator';
import { NotificationType } from './notification-type';

export type DailyEmotionNotifParamType = {
  [NotificationType.EMOTION_CHOSEN]: EmotionChosenParam;
  [NotificationType.EMOTION_POKE]: EmotionPokeParam;
};

export class EmotionChosenParam {
  @IsNumber()
  familyId: number;

  @IsNumber()
  userId: number;
}

export class EmotionPokeParam {
  @IsNumber()
  userId: number;

  @IsNumber()
  familyId: number;
}

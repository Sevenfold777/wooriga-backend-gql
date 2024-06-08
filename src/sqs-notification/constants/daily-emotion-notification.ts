import { IsNumber } from 'class-validator';
import { NotificationType } from './notification-type';

export type DailyEmotionNotifParamType = {
  [NotificationType.EMOTION_CHOSEN]: EmotionChosenParam;
  [NotificationType.EMOTION_POKE]: EmotionPokeParam;
};

class EmotionChosenParam {
  @IsNumber()
  familyId: number;
}

class EmotionPokeParam {
  @IsNumber()
  userId: number;
}

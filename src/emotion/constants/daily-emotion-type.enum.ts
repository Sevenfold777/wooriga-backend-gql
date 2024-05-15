import { registerEnumType } from '@nestjs/graphql';

export enum DailyEmotionType {
  HAPPY = 'happy',
  PASSION = 'passion',
  COMFORT = 'comfort',
  TIRED = 'tired',
  SAD = 'sad',
  SHARP = 'sharp',
}

registerEnumType(DailyEmotionType, { name: 'DailyEmotionType' });

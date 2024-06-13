import { registerEnumType } from '@nestjs/graphql';

export enum LetterEmotionType {
  happy = 'happy',
  passion = 'passion',
  comfort = 'comfort',
  tired = 'tired',
  sad = 'sad',
  sharp = 'sharp',
}

registerEnumType(LetterEmotionType, { name: 'LetterEmotion' });

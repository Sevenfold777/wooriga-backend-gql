import { registerEnumType } from '@nestjs/graphql';

export enum MessageEmotionType {
  happy = 'happy',
  passion = 'passion',
  comfort = 'comfort',
  tired = 'tired',
  sad = 'sad',
  sharp = 'sharp',
}

registerEnumType(MessageEmotionType, { name: 'MessageEmotion' });

import { registerEnumType } from '@nestjs/graphql';

export enum LetterType {
  SENT = 'SENT',
  RECEIVED = 'RECEIVED',
}

registerEnumType(LetterType, { name: 'LetterType' });

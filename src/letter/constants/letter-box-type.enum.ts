import { registerEnumType } from '@nestjs/graphql';

export enum LetterBoxType {
  ALL = 'ALL',
  TIME_CAPSULE = 'TIME_CAPSULE',
  KEPT = 'KEPT',
}

registerEnumType(LetterBoxType, { name: 'LetterBoxType' });

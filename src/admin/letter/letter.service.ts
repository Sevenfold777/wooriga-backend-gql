import { CountResDTO } from '../dto/count-res.dto';

export interface LetterService {
  getLetterCreateCount(): Promise<CountResDTO>;

  getTimeCapsuleCreateCount(): Promise<CountResDTO>;
}

export const LetterService = Symbol('LetterService');

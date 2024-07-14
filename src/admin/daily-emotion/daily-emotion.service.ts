import { CountResDTO } from '../dto/count-res.dto';

export interface DailyEmotionService {
  getEmotionCreateCount(): Promise<CountResDTO>;
}

export const DailyEmotionService = Symbol('DailyEmotionService');

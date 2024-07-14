import { CountResDTO } from '../dto/count-res.dto';

export interface FamilyPediaService {
  getPediaEditCount(): Promise<CountResDTO>;
}

export const FamilyPediaService = Symbol('FamilyPediaService');

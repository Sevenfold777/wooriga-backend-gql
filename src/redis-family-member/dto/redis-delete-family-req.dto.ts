import { IsNumber } from 'class-validator';

export class RedisDeleteFamilyReqDTO {
  @IsNumber()
  familyId: number;
}

import { IsNumber } from 'class-validator';

export class RedisDeleteUserReqDTO {
  @IsNumber()
  familyId: number;

  @IsNumber()
  userId: number;
}

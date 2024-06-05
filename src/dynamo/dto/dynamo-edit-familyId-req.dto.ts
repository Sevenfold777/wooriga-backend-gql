import { IsNumber } from 'class-validator';

export class DynamoEditFamilyIdReqDTO {
  @IsNumber()
  userId: number;

  @IsNumber()
  familyId: number;
}

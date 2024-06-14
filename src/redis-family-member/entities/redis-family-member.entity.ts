import { IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class RedisFamilyMember {
  @IsNumber()
  familyId: number;

  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsString()
  userName: string;

  @IsString()
  fcmToken: string;

  @IsBoolean()
  mktPushAgreed: boolean;
}

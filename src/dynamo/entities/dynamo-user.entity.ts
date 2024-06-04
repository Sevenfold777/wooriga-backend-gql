import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { UserStatus } from 'src/user/constants/user-status.enum';

export class DynamoUser {
  @IsNumber()
  @Min(0) // TODO: id 범위 정책에 따라 범위 제한
  id: number;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  userName: string;

  @IsNumber()
  @Min(0) // TODO: id 범위 정책에 따라 범위 제한
  familyId: number;

  @IsBoolean()
  mktPushAgreed: boolean;

  @IsString()
  fcmToken: string;

  /* status enum으로 인해 user module에 대한 의존성이 있지만,
     별개의 enum을 만든다면 오히려 유지 보수 어려울 듯하여 import 해서 사용 결정 */
  @IsEnum(UserStatus)
  status: UserStatus;
}

import { Field, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AuthProvider } from '../constants/auth-provider.enum';
import { FamilyPosition } from '../constants/family-position.enum';

@InputType()
export class SignUpReqDTO {
  @Field()
  @IsEmail()
  email: string;

  @Field(() => Boolean)
  @IsEnum(AuthProvider)
  provider: AuthProvider;

  @Field()
  @IsString()
  @IsNotEmpty()
  userName: string;

  @Field()
  @IsString()
  birthday: string;

  @Field(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isBirthLunar?: boolean;

  @Field(() => FamilyPosition)
  @IsEnum(FamilyPosition)
  position: FamilyPosition;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  familyToken?: string;

  @Field(() => Boolean)
  @IsBoolean()
  mktPushAgreed: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  token?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  nonce?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  fcmToken?: string;
}

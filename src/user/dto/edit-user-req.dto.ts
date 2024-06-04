import { ArgsType, Field } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { FamilyPosition } from '../constants/family-position.enum';

@ArgsType()
export class EditUserReqDTO {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  birthday?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isBirthLunar?: boolean;

  @Field(() => FamilyPosition, { nullable: true })
  @IsOptional()
  @IsEnum(FamilyPosition)
  position?: FamilyPosition;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  mktPushAgreed?: boolean;
}

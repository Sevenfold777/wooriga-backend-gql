import { Field, InputType, Int } from '@nestjs/graphql';
import { LetterType } from '../constants/letter-type.enum';
import { IsBoolean, IsEnum, IsNumber } from 'class-validator';

@InputType()
export class LetterBoxReqDTO {
  @Field(() => LetterType)
  @IsEnum(LetterType)
  type: LetterType;

  @Field(() => Int)
  @IsNumber()
  prev: number;

  @Field(() => Boolean)
  @IsBoolean()
  isTimeCapsule: boolean;
}

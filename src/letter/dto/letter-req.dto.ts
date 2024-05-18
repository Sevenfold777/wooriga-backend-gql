import { Field, InputType, Int } from '@nestjs/graphql';
import { LetterType } from '../constants/letter-type.enum';
import { IsEnum, IsNumber } from 'class-validator';

@InputType()
export class LetterReqDTO {
  @Field(() => Int)
  @IsNumber()
  id: number;

  @Field(() => LetterType)
  @IsEnum(LetterType)
  type: LetterType;
}

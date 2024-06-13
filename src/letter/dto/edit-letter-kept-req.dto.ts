import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsBoolean, IsNumber } from 'class-validator';

@ArgsType()
export class EditLetterKeptReqDTO {
  @Field(() => Int)
  @IsNumber()
  id: number;

  @Field(() => Boolean)
  @IsBoolean()
  kept: boolean;
}

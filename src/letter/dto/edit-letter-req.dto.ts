import { Field, InputType, Int, PartialType } from '@nestjs/graphql';
import { SendLetterReqDTO } from './send-letter-req.dto';
import { IsNumber } from 'class-validator';

@InputType()
export class EditLetterReqDTO extends PartialType(SendLetterReqDTO) {
  @Field(() => Int)
  @IsNumber()
  id: number;
}

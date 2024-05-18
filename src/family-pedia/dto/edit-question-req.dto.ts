import { Field, InputType, Int } from '@nestjs/graphql';
import { CreateQuestionReqDTO } from './create-question-req.dto';
import { IsNumber } from 'class-validator';

@InputType()
export class EditQuestionReqDTO extends CreateQuestionReqDTO {
  @Field(() => Int)
  @IsNumber()
  id: number;
}

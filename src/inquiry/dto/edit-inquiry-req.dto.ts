import { Field, InputType, Int, PartialType } from '@nestjs/graphql';
import { CreateInquiryReqDTO } from './create-inquiry-req.dto';

@InputType()
export class EditInquiryReqDTO extends PartialType(CreateInquiryReqDTO) {
  @Field(() => Int)
  id: number;
}

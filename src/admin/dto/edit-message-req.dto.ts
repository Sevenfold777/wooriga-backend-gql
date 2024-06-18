import { ArgsType, Field, Int, PartialType } from '@nestjs/graphql';
import { CreateMessageReqDTO } from './create-message-req.dto';

@ArgsType()
export class EditMessageReqDTO extends PartialType(CreateMessageReqDTO) {
  @Field(() => Int)
  id: number;
}

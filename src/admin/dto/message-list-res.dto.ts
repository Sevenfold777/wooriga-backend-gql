import { Field, ObjectType } from '@nestjs/graphql';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { MessageWithSent } from './message-with-sent.dto';

@ObjectType()
export class MessageListResDTO extends BaseResponseDTO {
  @Field(() => [MessageWithSent], { nullable: true })
  messageWithSents?: MessageWithSent[];
}

import { Field, ObjectType } from '@nestjs/graphql';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { Message } from 'src/message/entities/message.entity';

@ObjectType()
export class MessageListResDTO extends BaseResponseDTO {
  // @Field(() => [Message],)
}

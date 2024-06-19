import { Field, ObjectType } from '@nestjs/graphql';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { MessageWithStat } from './message-with-stat.dto';

@ObjectType()
export class MessageDetailResDTO extends BaseResponseDTO {
  @Field(() => MessageWithStat, { nullable: true })
  messageWithStat?: MessageWithStat;
}

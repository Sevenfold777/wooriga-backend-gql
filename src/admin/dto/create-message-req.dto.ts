import { ArgsType, Field } from '@nestjs/graphql';
import { MessageEmotionType } from 'src/message/constants/message-emotion-type.enum';
import { LinkableService } from 'src/message/constants/message-linkable-service.enum';

@ArgsType()
export class CreateMessageReqDTO {
  @Field()
  payload: string;

  @Field(() => MessageEmotionType)
  emotion: MessageEmotionType;

  @Field(() => Date)
  uploadAt: Date;

  @Field(() => LinkableService)
  linkTo: LinkableService;
}

import { InputType } from '@nestjs/graphql';
import { CreateDailyEmoReqDTO } from './create-daily-emo-req.dto';

@InputType()
export class EditDailyEmoReqDTO extends CreateDailyEmoReqDTO {}
// 추후 필요시 PartialType으로 상속

import { Field, InputType, Int, PartialType } from '@nestjs/graphql';
import { CreatePhotoReqDTO } from './create-photo-req.dto';
import { IsNumber } from 'class-validator';

@InputType()
export class EditPhotoReqDTO extends PartialType(CreatePhotoReqDTO) {
  @Field(() => Int)
  @IsNumber()
  id: number;
}

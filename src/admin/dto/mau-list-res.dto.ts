import { Field, ObjectType } from '@nestjs/graphql';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { MAU } from '../user/entities/mau.entity';

@ObjectType()
export class MauListResDTO extends BaseResponseDTO {
  @Field(() => [MAU], { nullable: true })
  mauList?: MAU[];
}

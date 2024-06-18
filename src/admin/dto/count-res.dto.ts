import { Field, Int, ObjectType } from '@nestjs/graphql';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';

@ObjectType()
export class CountResDTO extends BaseResponseDTO {
  @Field(() => Int, { nullable: true })
  count?: number;
}

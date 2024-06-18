import { Field, ObjectType } from '@nestjs/graphql';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { DAU } from '../entities/dau.entity';

@ObjectType()
export class DauListResDTO extends BaseResponseDTO {
  @Field(() => [DAU], { nullable: true })
  dauList?: DAU[];
}

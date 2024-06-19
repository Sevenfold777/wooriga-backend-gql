import { Field, ObjectType } from '@nestjs/graphql';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { UserWithStat } from './user-with-stat.dto';

@ObjectType()
export class UserDetailsResDTO extends BaseResponseDTO {
  @Field(() => [UserWithStat], { nullable: true })
  userDetails?: UserWithStat[];
}

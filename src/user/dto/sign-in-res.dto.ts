import { Field, Int, ObjectType } from '@nestjs/graphql';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';

@ObjectType()
export class SignInResDTO extends BaseResponseDTO {
  @Field({ nullable: true })
  accessToken?: string;

  @Field({ nullable: true })
  refreshToken?: string;

  @Field(() => Int)
  id?: number;

  @Field(() => Boolean)
  signUpRequired?: boolean;
}

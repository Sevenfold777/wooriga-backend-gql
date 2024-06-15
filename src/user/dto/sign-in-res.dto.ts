import { Field, ObjectType } from '@nestjs/graphql';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { SignInRejectType } from '../constants/sign-in-reject-type.enum';
import { User } from '../entities/user.entity';

@ObjectType()
export class SignInResDTO extends BaseResponseDTO {
  @Field({ nullable: true })
  accessToken?: string;

  @Field({ nullable: true })
  refreshToken?: string;

  @Field(() => SignInRejectType, { nullable: true })
  rejectType?: SignInRejectType;

  @Field(() => User, { nullable: true })
  user?: User;
}

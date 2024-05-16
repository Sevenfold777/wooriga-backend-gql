import { Field, InputType, PartialType } from '@nestjs/graphql';
import { SignUpReqDTO } from './sign-up-req.dto';
import { IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class EditUserReqDTO extends PartialType(SignUpReqDTO) {
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

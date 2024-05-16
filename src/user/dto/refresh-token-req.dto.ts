import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class RefreshTokenReqDTO {
  @Field()
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}

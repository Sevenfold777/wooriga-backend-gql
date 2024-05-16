import { IsEnum, IsString, IsOptional, IsBoolean } from 'class-validator';
import { AuthProvider } from '../constants/auth-provider.enum';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SignInReqDTO {
  @Field(() => AuthProvider)
  @IsEnum(AuthProvider)
  provider: AuthProvider;

  @Field()
  @IsString()
  token: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  nonce?: string;

  @Field(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isSignUp?: boolean;
}

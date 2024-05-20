import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BannerType } from '../constants/banner-type.enum';

@InputType()
export class BannerReqDTO {
  @Field(() => BannerType)
  @IsEnum(BannerType)
  type: BannerType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  screenName?: string;
}

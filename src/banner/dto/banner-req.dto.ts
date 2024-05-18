import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { BannerType } from '../constants/banner-type.enum';

@InputType()
export class BannerReqDTO {
  @Field(() => BannerType)
  @IsEnum(BannerType)
  type: BannerType;

  @Field()
  @IsNotEmpty()
  @IsString()
  screenName: string;
}

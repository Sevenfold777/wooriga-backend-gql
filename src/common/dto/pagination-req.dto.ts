import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNumber, IsOptional, Min } from 'class-validator';

@InputType()
export class PaginationReqDTO {
  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @Min(0)
  @IsNumber()
  prev?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @Min(1)
  take?: number;
}

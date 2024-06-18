import { ObjectType, Int, Field } from '@nestjs/graphql';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
@ObjectType()
export class MAU {
  @PrimaryColumn()
  @Field(() => Date)
  date: Date;

  @Column()
  @Field(() => Int)
  count: number;
}

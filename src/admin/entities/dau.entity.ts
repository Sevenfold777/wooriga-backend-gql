import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
@ObjectType()
export class DAU {
  @PrimaryColumn()
  @Field(() => Date)
  date: Date;

  @Column()
  @Field(() => Int)
  count: number;
}

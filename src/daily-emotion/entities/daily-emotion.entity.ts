import { User } from 'src/user/entities/user.entity';
import {
  Entity,
  Column,
  ManyToOne,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { DailyEmotionType } from '../constants/daily-emotion-type.enum';

@Entity()
@ObjectType()
export class DailyEmotion {
  @PrimaryColumn()
  @Field(() => Date)
  date: Date;

  @PrimaryColumn()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @Field(() => User)
  user: User;

  @Column({ type: 'enum', enum: DailyEmotionType })
  @Field(() => DailyEmotionType)
  type: DailyEmotionType;

  @CreateDateColumn()
  @Field(() => Date)
  createdAt: Date;

  @UpdateDateColumn()
  @Field(() => Date)
  updatedAt: Date;
}

import { CoreEntity } from 'src/common/entites/core.entity';
import { User } from 'src/user/entities/user.entity';
import { Entity, Column, ManyToOne } from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { DailyEmotionType } from '../constants/daily-emotion-type.enum';

@Entity()
@ObjectType()
export class DailyEmotion extends CoreEntity {
  @Column({ type: 'enum', enum: DailyEmotionType })
  @Field(() => DailyEmotionType)
  type: DailyEmotionType;

  @Column()
  @Field(() => Date)
  date: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @Field(() => User)
  user: User;
}

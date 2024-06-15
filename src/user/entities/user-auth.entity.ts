import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
@ObjectType()
export class UserAuth {
  @PrimaryColumn()
  @Field(() => Int)
  userId: number;

  @OneToOne(() => User, (user) => user.userAuth, { onDelete: 'CASCADE' })
  @JoinColumn()
  @Field(() => User)
  user: User;

  @Column({ nullable: true })
  @Field({ nullable: true })
  refreshToken?: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  providerId?: string;

  @CreateDateColumn()
  @Field(() => Date)
  createdAt: Date;

  @UpdateDateColumn()
  @Field(() => Date)
  updatedAt: Date;
}

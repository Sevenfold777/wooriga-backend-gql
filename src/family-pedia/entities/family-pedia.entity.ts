import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FamilyPediaQuestion } from './family-pedia-question';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@Entity()
@ObjectType()
export class FamilyPedia {
  @PrimaryColumn()
  @Field(() => Int)
  ownerId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  @Field(() => User)
  owner: User;

  @Column({ default: process.env.FAMILY_PEDIA_DEFAULT_IMG })
  @Field()
  profilePhoto: string;

  // default 4:3 비율
  @Column({ default: 2000 })
  @Field(() => Int)
  profileWidth: number;

  @Column({ default: 1500 })
  @Field(() => Int)
  profileHeight: number;

  @OneToMany(() => FamilyPediaQuestion, (question) => question.familyPedia)
  @Field(() => [FamilyPediaQuestion])
  questions: FamilyPediaQuestion[];

  @CreateDateColumn()
  @Field(() => Date)
  createdAt: Date;

  @UpdateDateColumn()
  @Field(() => Date)
  updatedAt: Date;
}

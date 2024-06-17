import { CoreEntity } from 'src/common/entites/core.entity';
import { User } from 'src/user/entities/user.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { LetterEmotionType } from '../constants/letter-emotion-type.enum';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@Entity()
@ObjectType()
export class Letter extends CoreEntity {
  @Column()
  @Field()
  title: string;

  @Column({ length: 1023 })
  @Field()
  payload: string; // 1000자 제한

  @Column({ type: 'enum', enum: LetterEmotionType })
  @Field(() => LetterEmotionType)
  emotion: LetterEmotionType;

  @Column({ default: false })
  @Field(() => Boolean)
  isRead: boolean; // 수신확인

  @Column({ default: false })
  @Field(() => Boolean)
  isTemp: boolean; // 임시저장

  // sender receiver에 대하여 onDelete Cascade 되지 않음 (=>left join 사용)
  @Column({ name: 'senderId', default: null })
  @Field(() => Int, { nullable: true })
  senderId: number;

  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'senderId' })
  @Field(() => User, { nullable: true })
  sender: User;

  @Column({ name: 'receiverId', default: null })
  @Field(() => Int, { nullable: true })
  receiverId: number;

  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'receiverId' })
  @Field(() => User, { nullable: true })
  receiver: User;

  /** for time capsules */
  @Column({ default: false })
  @Field(() => Boolean)
  isTimeCapsule: boolean;

  @Column({ nullable: true })
  @Field(() => Date)
  receiveDate: Date; // timeCapsule 아니면 createdAt과 같음

  @Column({ default: false })
  @Field(() => Boolean)
  kept: boolean;
}

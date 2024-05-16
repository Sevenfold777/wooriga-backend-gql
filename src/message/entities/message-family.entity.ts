import { CoreEntity } from 'src/common/entites/core.entity';
import { Family } from 'src/family/entities/family.entity';
import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { Message } from './message.entity';
import { MessageComment } from './message-comment.entity';
import { Field, ObjectType } from '@nestjs/graphql';

@Entity()
@ObjectType()
export class MessageFamily extends CoreEntity {
  /**
   * 하나의 Message 당 여러 MessageFamily를 가질 수 있도록 서비스 확장 가능
   * e.g. 1년 단위 메세지 반복
   * 따라서 composite key 고려하지 않음
   */

  @Column()
  @Field(() => Date)
  receiveDate: Date;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @Field(() => Message)
  message: Message;

  @ManyToOne(() => Family, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @Field(() => Family)
  family: Family;

  @OneToMany(() => MessageComment, (comment) => comment.message, {
    eager: false,
  })
  @Field(() => [MessageComment])
  comments: MessageComment[];
}

import { CoreEntity } from 'src/common/entites/core.entity';
import { Family } from 'src/family/entities/family.entity';
import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { Message } from './message.entity';
import { MessageComment } from './message-comment.entity';
import { Field, ObjectType } from '@nestjs/graphql';

@Entity()
@ObjectType()
export class MessageFamily extends CoreEntity {
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

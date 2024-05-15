import { Entity, ManyToOne } from 'typeorm';
import { CoreEntity } from 'src/common/entites/core.entity';
import { User } from 'src/user/entities/user.entity';
import { MessageFamily } from './message-family.entity';
import { Field, ObjectType } from '@nestjs/graphql';

@Entity({ name: 'message_family_keep' })
@ObjectType()
export class MessageKeep extends CoreEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @Field(() => User)
  user: User;

  @ManyToOne(() => MessageFamily, { onDelete: 'CASCADE' })
  @Field(() => MessageFamily)
  message: MessageFamily;
}

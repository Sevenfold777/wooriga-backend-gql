import { CoreEntity } from 'src/common/entites/core.entity';
import { User } from 'src/user/entities/user.entity';
import { Entity, ManyToOne } from 'typeorm';
import { Letter } from './letter.entity';
import { Field, ObjectType } from '@nestjs/graphql';

@Entity()
@ObjectType()
export class LetterKeep extends CoreEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @Field(() => User)
  user: User;

  @ManyToOne(() => Letter, { onDelete: 'CASCADE' })
  @Field(() => Letter)
  letter: Letter;
}

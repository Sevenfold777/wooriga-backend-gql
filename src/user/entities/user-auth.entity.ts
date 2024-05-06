import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { User } from './user.entity';
import { CoreEntity } from 'src/common/entites/core.entity';

@Entity()
@ObjectType()
export class UserAuth extends CoreEntity {
  @OneToOne(() => User, (user) => user.userAuth, { onDelete: 'CASCADE' })
  @JoinColumn()
  @Field(() => User)
  user: User;

  @Column()
  @Field(() => String)
  refreshToken: string;

  @Column({ nullable: true })
  @Field(() => String)
  providerId?: string;
}

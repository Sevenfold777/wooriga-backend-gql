import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, OneToOne } from 'typeorm';
import { AuthProvider } from '../constants/auth-provider.enum';
import { FamilyPosition } from '../constants/family-position.enum';
import { UserStatus } from '../constants/user-status.enum';
import { UserAuth } from './user-auth.entity';
import { CoreEntity } from 'src/common/entites/core.entity';

@Entity()
@ObjectType()
export class User extends CoreEntity {
  @Column({ unique: true })
  @Field(() => String)
  email: string;

  @Column({ type: 'enum', enum: AuthProvider })
  @Field(() => AuthProvider)
  provider: AuthProvider;

  @Column()
  fcmToken: string;

  @Column()
  userName: string;

  @Column({ type: 'enum', enum: FamilyPosition })
  @Field(() => FamilyPosition)
  position: FamilyPosition;

  @OneToOne(() => UserAuth, (auth) => auth.user)
  @Field(() => UserAuth)
  userAuth: UserAuth;

  // @Column({
  //   default:
  //     'https://k.kakaocdn.net/dn/dpk9l1/btqmGhA2lKL/Oz0wDuJn1YV2DIn92f6DVK/img_110x110.jpg',
  // }) // 추후 nullable --> default profile image link
  // profileImage: string;

  @Column({ default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ nullable: true })
  birthday: Date;

  @Column({ default: false })
  isBirthLunar: boolean;

  @Column()
  mktPushAgreed: boolean;
}

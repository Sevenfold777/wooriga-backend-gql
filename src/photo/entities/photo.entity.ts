import { CoreEntity } from 'src/common/entites/core.entity';
import { Family } from 'src/family/entities/family.entity';
import { User } from 'src/user/entities/user.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { PhotoComment } from './photo-comment.entity';
import { PhotoFile } from './photo-file.entity';
import { Field, ObjectType } from '@nestjs/graphql';

@Entity()
@ObjectType()
export class Photo extends CoreEntity {
  @OneToMany(() => PhotoFile, (files) => files.photo)
  @Field(() => [PhotoFile])
  files: PhotoFile[];

  @Column({ nullable: true, length: 700 })
  @Field()
  payload: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @Field(() => User)
  author: User;

  @ManyToOne(() => Family, { onDelete: 'CASCADE' })
  @Field(() => Family)
  family: Family;

  @OneToMany(() => PhotoComment, (comment) => comment.photo)
  @Field(() => [PhotoComment])
  comments: PhotoComment[];

  /**
   * TODO: (양방향까지 필요할까?)
   * 좋아요 역할을 keep의 역할로 바꾼다면 자신이 like 했는지만 확인하면 됨
   * service 구현하면서 다시 생각해보기
   */
  //   @OneToMany(() => PhotoLike, (like) => like.photo)
  //   likes: PhotoLike[];
}

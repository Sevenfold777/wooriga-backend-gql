import { PhotoFileMetaDataDTO } from './../dto/photo-file-metadata.dto';
import { CoreEntity } from 'src/common/entites/core.entity';
import { Family } from 'src/family/entities/family.entity';
import { User } from 'src/user/entities/user.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { PhotoComment } from './photo-comment.entity';
import { PhotoFile } from './photo-file.entity';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PhotoLike } from './photo-like.entity';
import { PhotoCommentMetaDataDTO } from '../dto/photo-comment-metadata.dto';

@Entity()
@ObjectType()
export class Photo extends CoreEntity {
  @OneToMany(() => PhotoFile, (files) => files.photo)
  @Field(() => [PhotoFile])
  files: PhotoFile[];

  @Column({ name: 'theme' })
  @Field()
  title: string;

  @Column({ nullable: true, length: 700 })
  @Field()
  payload: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @Field(() => User)
  author: User;

  @Column({ nullable: true })
  @Field(() => Int)
  familyId: number;

  @ManyToOne(() => Family, { onDelete: 'CASCADE', nullable: true })
  @Field(() => Family)
  family: Family;

  @OneToMany(() => PhotoComment, (comment) => comment.photo)
  @Field(() => [PhotoComment])
  comments: PhotoComment[];

  @Field(() => Boolean, { nullable: true })
  isLiked?: boolean;

  // field로 넣을 필요는 없음; 사용자 본인이 like 했는지 확인하는 용도
  @OneToMany(() => PhotoLike, (like) => like.photo, { onDelete: 'CASCADE' })
  likes: PhotoLike[];

  /* resolved field: 선언하지 않아도 되지만 for typescript error handle */
  fileMetaData?: PhotoFileMetaDataDTO;
  commentMetaData?: PhotoCommentMetaDataDTO;

  @Column({ default: false })
  uploaded: boolean;
}

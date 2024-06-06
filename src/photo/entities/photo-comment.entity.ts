import { CommentEntity } from 'src/common/entites/comment.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Photo } from './photo.entity';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@Entity()
@ObjectType()
export class PhotoComment extends CommentEntity {
  @ManyToOne(() => Photo, { createForeignKeyConstraints: false })
  @Field(() => Photo)
  photo: Photo;

  @Column()
  @Field(() => Int)
  photoId: number;
}

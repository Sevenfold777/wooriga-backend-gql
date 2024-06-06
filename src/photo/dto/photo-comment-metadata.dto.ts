import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PhotoComment } from '../entities/photo-comment.entity';

@ObjectType()
export class PhotoCommentMetaDataDTO {
  @Field(() => Int, { nullable: true })
  commentsCount: number;

  @Field(() => [PhotoComment], { nullable: true })
  commentsPreview: PhotoComment[];
}

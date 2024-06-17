import { Field, Int, ObjectType } from '@nestjs/graphql';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';

@ObjectType()
export class CreatePhotoResDTO extends BaseResponseDTO {
  @Field(() => [String], { nullable: true })
  presignedUrls?: string[];

  @Field(() => Int, { nullable: true })
  photoId?: number;
}

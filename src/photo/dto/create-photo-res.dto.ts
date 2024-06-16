import { Field, ObjectType } from '@nestjs/graphql';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';

@ObjectType()
export class CreatePhotoResDTO extends BaseResponseDTO {
  @Field(() => [String])
  presignedUrls?: string[];
}

import { Field, Int, ObjectType } from '@nestjs/graphql';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';

@ObjectType()
export class CreateProfilePhotoResDTO extends BaseResponseDTO {
  @Field({ nullable: true })
  presignedUrl?: string;

  @Field(() => Int, { nullable: true })
  pediaId?: number;
}

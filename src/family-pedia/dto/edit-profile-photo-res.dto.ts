import { Field, ObjectType } from '@nestjs/graphql';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';

@ObjectType()
export class EditProfilePhotoResDTO extends BaseResponseDTO {
  @Field({ nullable: true })
  presignedUrl?: string;
}

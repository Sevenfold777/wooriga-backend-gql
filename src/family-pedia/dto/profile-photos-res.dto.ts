import { Field, ObjectType } from '@nestjs/graphql';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { FamilyPediaProfilePhoto } from '../entities/family-pedia-profile-photo.entity';

@ObjectType()
export class ProfilePhotosResDTO extends BaseResponseDTO {
  @Field(() => [FamilyPediaProfilePhoto], { nullable: true })
  profilePhotos?: FamilyPediaProfilePhoto[];
}

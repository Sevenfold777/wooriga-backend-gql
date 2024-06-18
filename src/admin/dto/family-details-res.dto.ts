import { Field, ObjectType } from '@nestjs/graphql';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { Family } from 'src/family/entities/family.entity';

@ObjectType()
export class FamilyDetailsResDTO extends BaseResponseDTO {
  @Field(() => [Family], { nullable: true })
  families?: Family[];
}

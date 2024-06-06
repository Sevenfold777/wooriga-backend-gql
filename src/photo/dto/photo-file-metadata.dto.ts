import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PhotoFileMetaDataDTO {
  @Field({ nullable: true })
  thumbnailUrl: string;

  @Field(() => Int, { nullable: true })
  filesCount: number;
}

import { CoreEntity } from 'src/common/entites/core.entity';
import { Entity, Column, OneToMany } from 'typeorm';
import { BannerPayloadType } from '../constants/banner-payload-type.enum';
import { BannerType } from '../constants/banner-type.enum';
import { BannerPayloadPlacement } from './banner-payload-placement.entity';
import { Field, ObjectType } from '@nestjs/graphql';

@Entity()
@ObjectType()
export class Banner extends CoreEntity {
  @Column()
  @Field()
  url: string;

  @Column()
  @Field(() => BannerType)
  type: BannerType;

  @Column({ nullable: true })
  @Field()
  description: string;

  @Column()
  @Field(() => BannerPayloadType)
  payloadType: BannerPayloadType;

  @Column()
  @Field()
  payloadPath: string;

  @OneToMany(() => BannerPayloadPlacement, (place) => place.banner)
  @Field(() => BannerPayloadPlacement)
  placement: BannerPayloadPlacement;
}

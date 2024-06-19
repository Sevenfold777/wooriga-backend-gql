import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { FamilyPedia } from './family-pedia.entity';
import { CoreEntity } from 'src/common/entites/core.entity';

@Entity()
@ObjectType()
export class FamilyPediaProfilePhoto extends CoreEntity {
  @Column()
  @Field()
  url: string;

  @Column({ nullable: true })
  @Field(() => Int)
  width: number;

  @Column({ nullable: true })
  @Field(() => Int)
  height: number;

  @Column({ name: 'familyPediaId' })
  @Field(() => Int)
  familyPediaId: number;

  @ManyToOne(() => FamilyPedia, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'familyPediaId' })
  familyPedia: FamilyPedia;

  // gql에 드러내지 않고 내부적으로만 사용 => @Field() 사용 X
  @Column({ default: false })
  uploaded: boolean;
}

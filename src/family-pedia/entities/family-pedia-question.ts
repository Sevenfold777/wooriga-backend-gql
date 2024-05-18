import { CoreEntity } from 'src/common/entites/core.entity';
import { Entity, ManyToOne, Column } from 'typeorm';
import { FamilyPedia } from './family-pedia.entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { User } from 'src/user/entities/user.entity';

@Entity({ name: 'family_pedia_row' })
@ObjectType()
export class FamilyPediaQuestion extends CoreEntity {
  @ManyToOne(() => FamilyPedia, (familyPedia) => familyPedia.questions, {
    onDelete: 'CASCADE',
  })
  @Field(() => FamilyPedia)
  familyPedia: FamilyPedia;

  @Column({ name: 'tag' })
  @Field()
  question: string;

  @Column({ name: 'payload' })
  @Field()
  answer: string;

  @ManyToOne(() => User)
  @Field(() => User, { description: '질문 작성자' })
  questioner: User;
}

/**
 * 기존의 위키식 사전 수정 방식에서, 20문 20답 느낌으로 서비스 변경
 * 이전에는 모두가 answer(payload)를 수정할 수 있었지만, family pedia owner만 답변 가능
 * + 이에 따라 적합한 이름으로 class와 field명 변경
 * + db에서는 변경하지 않기 위해 {name: string} 파라미터 활용
 */
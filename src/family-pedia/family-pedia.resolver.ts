import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FamilyPediaService } from './family-pedia.service';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { FamilyPedia } from './entities/family-pedia.entity';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { AnswerQuestionReqDTO } from './dto/answer-question-req.dto';
import { EditQuestionReqDTO } from './dto/edit-question-req.dto';
import { CreateQuestionReqDTO } from './dto/create-question-req.dto';

@Resolver(() => FamilyPedia)
export class FamilyPediaResolver {
  constructor(private readonly familyPediaService: FamilyPediaService) {}

  /**
   * edit profile
   * => upload module에서 연계 구현
   * (service는 family pedia module 것 사용)
   * (REST API mutipart/form-data)
   */

  @Query(() => [FamilyPedia])
  findPedias(@AuthUser() user: AuthUserId): Promise<FamilyPedia[]> {
    return null;
  }

  @Query(() => FamilyPedia)
  findPedia(
    @AuthUser() user: AuthUserId,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<FamilyPedia> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  createQuestion(
    @AuthUser() user: AuthUserId,
    @Args('reqDTO') createuestionReqDTO: CreateQuestionReqDTO,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  // iff 아직 답장 안했을 경우
  @Mutation(() => BaseResponseDTO)
  editQuestion(
    @AuthUser() user: AuthUserId,
    @Args('reqDTO') editQuestionReqDTO: EditQuestionReqDTO,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  // if 답장 안했을 경우 question 만든 사람 삭제 가능
  // if 피디아 주인이 삭제
  @Mutation(() => BaseResponseDTO)
  deleteQuestion(
    @AuthUser() user: AuthUserId,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  // editQuestion으로 퉁칠지
  @Mutation(() => BaseResponseDTO)
  answerQuestion(
    @AuthUser() user: AuthUserId,
    @Args('reqDTO') answerQuestionReqDTO: AnswerQuestionReqDTO,
  ): Promise<BaseResponseDTO> {
    return null;
  }
}

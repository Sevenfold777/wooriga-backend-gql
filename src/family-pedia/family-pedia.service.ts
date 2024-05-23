import { Injectable } from '@nestjs/common';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { FamilyPedia } from './entities/family-pedia.entity';
import { CreateQuestionReqDTO } from './dto/create-question-req.dto';
import { EditQuestionReqDTO } from './dto/edit-question-req.dto';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { AnswerQuestionReqDTO } from './dto/answer-question-req.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { FamilyPediaQuestion } from './entities/family-pedia-question';
import { FamilyPediasResDTO } from './dto/family-pedias-res.dto';
import { FamilyPediaResDTO } from './dto/family-pedia-res.dto';
import { CreateResDTO } from 'src/common/dto/create-res.dto';
import { CreateFamilyPediaReqDTO } from './dto/create-family-pedia-req.dto';

@Injectable()
export class FamilyPediaService {
  constructor(
    @InjectRepository(FamilyPedia)
    private pediaRepository: Repository<FamilyPedia>,
    @InjectRepository(FamilyPediaQuestion)
    private questionRepository: Repository<FamilyPediaQuestion>,
    // @InjectRepository(User)
    // private userRepository: Repository<User>,
  ) {}

  async createFamilyPedia({
    ownerId,
  }: CreateFamilyPediaReqDTO): Promise<BaseResponseDTO> {
    try {
      const defaultQuestions = [
        '가장 좋아하는 음식이 무엇인가요?',
        '어릴 적 꿈은 무엇이었나요?',
        '요즘 여행가보고 싶은 나라가 있나요? 어디인가요?',
        '올해 가장 행복했던 일은 무엇인가요?',
        '앞으로 해보고 싶은 것을 알려주세요!',
      ];

      // insert new Pedia
      const pediaResult = await this.pediaRepository
        .createQueryBuilder('FamilyPedia')
        .insert()
        .into(FamilyPedia)
        .values({ owner: { id: ownerId } })
        .updateEntity(false)
        .execute();

      const pediaId = pediaResult.raw.insertId;

      // default question bulk insert
      const qInsertQuery = this.pediaRepository
        .createQueryBuilder('FamilyPedia')
        .insert()
        .into(FamilyPediaQuestion);

      for (const q of defaultQuestions) {
        qInsertQuery.values({ familyPedia: { id: pediaId }, question: q });
      }

      await qInsertQuery.execute();

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async findPedias({ familyId }: AuthUserId): Promise<FamilyPediasResDTO> {
    try {
      const pedias = await this.pediaRepository
        .createQueryBuilder('pedia')
        .select()
        .innerJoinAndSelect(
          'pedia.owner',
          'user',
          'user.familyId = :familyId',
          { familyId },
        )
        .getMany();

      return { result: true, familyPedias: pedias };
    } catch (e) {}
  }

  async findPedia(
    { familyId }: AuthUserId,
    id: number,
  ): Promise<FamilyPediaResDTO> {
    try {
      const pedia = await this.pediaRepository
        .createQueryBuilder('pedia')
        .select()
        .innerJoinAndSelect(
          'pedia.owner',
          'user',
          'user.familyId = :familyId',
          { familyId },
        )
        .where('pedia.id = :id', { id })
        .getOneOrFail();

      return { result: true, familyPedia: pedia };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async createQuestion(
    { userId, familyId }: AuthUserId,
    { question, pediaId }: CreateQuestionReqDTO,
  ): Promise<CreateResDTO> {
    try {
      // check if in same family
      await this.questionRepository
        .createQueryBuilder('pedia')
        .select()
        .where('id = :pediaId', { pediaId })
        .andWhere('owner.familyId = :familyId', { familyId })
        .getOneOrFail();

      const insertResult = await this.questionRepository
        .createQueryBuilder('question')
        .insert()
        .into(FamilyPediaQuestion)
        .values({
          question,
          questioner: { id: userId },
          familyPedia: { id: pediaId },
        })
        .updateEntity(false)
        .execute();

      const questionId = insertResult.raw.insertId;

      return { result: true, id: questionId };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  // iff 내가 한 질문에 아직 답장 안했을 경우
  async editQuestion(
    { userId, familyId }: AuthUserId,
    { id, question, pediaId }: EditQuestionReqDTO,
  ): Promise<BaseResponseDTO> {
    try {
      const updateResult = await this.questionRepository
        .createQueryBuilder('question')
        .update()
        .where('questioner.id = :userId', { userId })
        .andWhere('familyPedia.owner.familyId = :familyId', { familyId }) // TODO
        .andWhere('familyPedia.id = :pediaId', { pediaId })
        .andWhere('id = :id', { id })
        .andWhere('answer IS NULL')
        .set({ question })
        .updateEntity(false)
        .execute();

      if (updateResult.affected !== 1) {
        throw new Error('Cannot modify the question.');
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  // if 답장 안했을 경우 question 만든 사람 삭제 가능
  // if 피디아 주인이 삭제
  async deleteQuestion(
    { userId, familyId }: AuthUserId,
    id: number,
  ): Promise<BaseResponseDTO> {
    try {
      const targetQuestion = await this.questionRepository
        .createQueryBuilder('question')
        .select()
        .innerJoinAndSelect(
          'question.familyPedia',
          'pedia',
          'pedia.owner.familyId = :familyId',
          { familyId },
        )
        .where('id = :id', { id })
        .getOneOrFail();

      let deleteResult: DeleteResult;

      if (targetQuestion.familyPedia.owner.id === userId) {
        // if 피디아 주인이 삭제
        deleteResult = await this.questionRepository
          .createQueryBuilder('question')
          .delete()
          .from(FamilyPediaQuestion)
          .where('id = :id', { id })
          .execute();
      } else {
        // if 답장 안했을 경우 question 만든 사람 삭제 가능
        deleteResult = await this.questionRepository
          .createQueryBuilder('question')
          .delete()
          .from(FamilyPediaQuestion)
          .where('questioner.id = :userId', { userId })
          .andWhere('id = :id', { id })
          .andWhere('answer IS NULL')
          .execute();
      }

      if (deleteResult.affected !== 1) {
        throw new Error('Cannot delete the question.');
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  // editQuestion으로 퉁칠지
  async answerQuestion(
    { userId, familyId }: AuthUserId,
    { id, answer, pediaId }: AnswerQuestionReqDTO,
  ): Promise<BaseResponseDTO> {
    try {
      const updateResult = await this.questionRepository
        .createQueryBuilder('question')
        .update()
        .where('questioner.id = :userId', { userId })
        .andWhere('familyPedia.owner.familyId = :familyId', { familyId }) // TODO
        .andWhere('familyPedia.id = :pediaId', { pediaId })
        .andWhere('id = :id', { id })
        .set({ answer })
        .updateEntity(false)
        .execute();

      if (updateResult.affected !== 1) {
        throw new Error('Cannot modify the question.');
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }
}

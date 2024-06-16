import { SqsNotificationService } from './../sqs-notification/sqs-notification.service';
import { Injectable } from '@nestjs/common';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { FamilyPedia } from './entities/family-pedia.entity';
import { CreateQuestionReqDTO } from './dto/create-question-req.dto';
import { EditQuestionReqDTO } from './dto/edit-question-req.dto';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { AnswerQuestionReqDTO } from './dto/answer-question-req.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FamilyPediaQuestion } from './entities/family-pedia-question';
import { FamilyPediasResDTO } from './dto/family-pedias-res.dto';
import { FamilyPediaResDTO } from './dto/family-pedia-res.dto';
import { CreateResDTO } from 'src/common/dto/create-res.dto';
import { CreateFamilyPediaReqDTO } from './dto/create-family-pedia-req.dto';
import { SqsNotificationProduceDTO } from 'src/sqs-notification/dto/sqs-notification-produce.dto';
import { NotificationType } from 'src/sqs-notification/constants/notification-type';
import { EditProfilePhotoResDTO } from './dto/edit-profile-photo-res.dto';
import { S3Service } from 'src/s3/s3.service';
import { S3Directory } from 'src/s3/constants/s3-directory.enum';

@Injectable()
export class FamilyPediaService {
  constructor(
    @InjectRepository(FamilyPedia)
    private pediaRepository: Repository<FamilyPedia>,
    @InjectRepository(FamilyPediaQuestion)
    private questionRepository: Repository<FamilyPediaQuestion>,
    // @InjectRepository(User)
    // private userRepository: Repository<User>,
    private readonly sqsNotificationService: SqsNotificationService,
    private readonly s3Service: S3Service,
  ) {}

  // 같은 가족이라면 사진을 수정할 수 있음
  async editProfilePhoto(
    { familyId }: AuthUserId,
    pediaId: number,
  ): Promise<EditProfilePhotoResDTO> {
    try {
      // pedia owner가 나의 가족인지 확인
      const pediaExist = await this.pediaFamValidate(pediaId, familyId);

      if (!pediaExist) {
        throw new Error('Cannot edit the question in the pedia.');
      }

      // get presigned url
      const presignedUrl = await this.s3Service.getPresignedUrl({
        userId: pediaId,
        dir: S3Directory.PEDIA,
        fileId: pediaId,
        expiresIn: 60 * 5,
      });

      if (!presignedUrl.result) {
        throw new Error('Error occurred during upload configuration.');
      }

      // 알림은 파일 업로드 완료 후 처리
      // 그때 previous pedia profile photo를 s3에서 삭제

      return { result: true, presignedUrl: presignedUrl.url };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async createFamilyPedia({
    ownerId,
  }: CreateFamilyPediaReqDTO): Promise<BaseResponseDTO> {
    try {
      const defaultQuestions = [
        '가장 좋아하는 음식이 무엇인가요?',
        '어릴 적 꿈은 무엇이었나요?',
        '요즘 여행 가보고 싶은 나라가 있나요? 어디인가요?',
        '올해 가장 행복했던 일은 무엇인가요?',
        '앞으로 해보고 싶은 것 하나를 꼽아보자면?',
      ];

      // insert new Pedia
      const pediaResult = await this.pediaRepository
        .createQueryBuilder('FamilyPedia')
        .insert()
        .into(FamilyPedia)
        .values({ owner: { id: ownerId } })
        .updateEntity(false)
        .execute();

      if (!pediaResult.raw.insertId) {
        throw new Error('Cannot save the family pedia.');
      }

      // default question bulk insert
      const qInsertQuery = this.pediaRepository
        .createQueryBuilder('FamilyPedia')
        .insert()
        .into(FamilyPediaQuestion);

      for (const q of defaultQuestions) {
        qInsertQuery.values({ familyPedia: { ownerId }, question: q });
      }

      await qInsertQuery.execute();

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async findPedias({
    userId,
    familyId,
  }: AuthUserId): Promise<FamilyPediasResDTO> {
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

      pedias.sort((a, b) => {
        if (a.owner.id === userId) return -1;
        else if (b.owner.id === userId) return 1;
        else return a.owner.id - b.owner.id;
      });

      return { result: true, familyPedias: pedias };
    } catch (e) {
      return { result: false, error: e.message };
    }
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
        .leftJoinAndSelect('pedia.questions', 'question')
        .where('pedia.owner.id = :id', { id })
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
      const pediaExist = await this.pediaFamValidate(pediaId, familyId);

      if (!pediaExist) {
        throw new Error('Cannot add question to the pedia.');
      }

      const insertResult = await this.questionRepository
        .createQueryBuilder('question')
        .insert()
        .into(FamilyPediaQuestion)
        .values({
          question,
          questioner: { id: userId },
          familyPedia: { owner: { id: pediaId } },
        })
        .updateEntity(false)
        .execute();

      const questionId = insertResult.raw.insertId;

      // 알림
      const sqsDTO = new SqsNotificationProduceDTO(
        NotificationType.PEDIA_QUESTION_CREATED,
        { ownerId: pediaId },
      );

      this.sqsNotificationService.sendNotification(sqsDTO);

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
      // pedia owner가 나의 가족인지 확인
      const pediaExist = await this.pediaFamValidate(pediaId, familyId);

      if (!pediaExist) {
        throw new Error('Cannot edit the question in the pedia.');
      }

      // question update with conditions
      const updateResult = await this.questionRepository
        .createQueryBuilder('question')
        .update()
        .where('questioner.id = :userId', { userId })
        .andWhere('familyPedia.ownerId = :pediaId', { pediaId })
        .andWhere('id = :id', { id })
        .andWhere('answer IS NULL')
        .set({ question })
        .updateEntity(false)
        .execute();

      if (updateResult.affected !== 1) {
        throw new Error('Cannot modify the question.');
      }

      // 알림
      const sqsDTO = new SqsNotificationProduceDTO(
        NotificationType.PEDIA_QUESTION_EDITTED,
        { ownerId: pediaId },
      );

      this.sqsNotificationService.sendNotification(sqsDTO);

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
        .innerJoinAndSelect('question.familyPedia', 'pedia')
        .innerJoinAndSelect(
          'pedia.owner',
          'owner',
          'owner.family.id = :familyId',
          { familyId },
        )
        .where('question.id = :id', { id })
        .getOne();

      if (!Boolean(targetQuestion)) {
        throw new Error('Cannot access to the pedia related to the question.');
      }

      const query = this.questionRepository
        .createQueryBuilder('question')
        .delete()
        .from(FamilyPediaQuestion)
        .where('id = :id', { id });

      // Pedia 주인 아닌 경우 - 답장 안했을 경우 question 만든 사람 삭제 가능
      if (targetQuestion.familyPedia.owner.id !== userId) {
        query
          .andWhere('questioner.id = :userId', { userId })
          .andWhere('answer IS NULL');
      }

      const deleteResult = await query.execute();

      if (deleteResult.affected !== 1) {
        throw new Error('Cannot delete the question due to permission.');
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async answerQuestion(
    { userId, familyId }: AuthUserId,
    { id, answer }: AnswerQuestionReqDTO,
  ): Promise<BaseResponseDTO> {
    try {
      // 자신의 인물사전인지 체크
      const question = await this.questionRepository
        .createQueryBuilder('question')
        .select('question.id')
        .innerJoin(
          'question.familyPedia',
          'pedia',
          'pedia.ownerId = :pediaId',
          { pediaId: userId },
        )
        .where('question.id = :id', { id })
        .getOne();

      if (!Boolean(question)) {
        throw new Error('Cannot find the pedia with permission.');
      }

      // question update with conditions
      const updateResult = await this.questionRepository
        .createQueryBuilder('question')
        .update()
        .where('id = :id', { id })
        .andWhere('familyPedia.ownerId = :pediaId', { pediaId: userId })
        .set({ answer })
        .updateEntity(false)
        .execute();

      if (updateResult.affected !== 1) {
        throw new Error('Cannot answer the question.');
      }

      // 알림
      const sqsDTO = new SqsNotificationProduceDTO(
        NotificationType.PEDIA_ANSWER,
        { familyId },
      );

      this.sqsNotificationService.sendNotification(sqsDTO);

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async pediaFamValidate(pediaId: number, familyId: number): Promise<boolean> {
    const exist = await this.pediaRepository
      .createQueryBuilder('pedia')
      .select('pedia.ownerId')
      .innerJoin('pedia.owner', 'owner', 'owner.familyId = :familyId', {
        familyId,
      })
      .where('pedia.owner.id = :pediaId', { pediaId })
      .getOne();

    return Boolean(exist);
  }
}

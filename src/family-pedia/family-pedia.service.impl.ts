import { SqsNotificationService } from './../sqs-notification/sqs-notification.service';
import { Inject, Injectable } from '@nestjs/common';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { FamilyPedia } from './entities/family-pedia.entity';
import { CreateQuestionReqDTO } from './dto/create-question-req.dto';
import { EditQuestionReqDTO } from './dto/edit-question-req.dto';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { AnswerQuestionReqDTO } from './dto/answer-question-req.dto';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { FamilyPediaQuestion } from './entities/family-pedia-question';
import { FamilyPediasResDTO } from './dto/family-pedias-res.dto';
import { FamilyPediaResDTO } from './dto/family-pedia-res.dto';
import { CreateResDTO } from 'src/common/dto/create-res.dto';
import { SqsNotificationReqDTO } from 'src/sqs-notification/dto/sqs-notification-req.dto';
import { NotificationType } from 'src/sqs-notification/constants/notification-type';
import { S3Service } from 'src/s3/s3.service';
import { S3Directory } from 'src/s3/constants/s3-directory.enum';
import { FamilyPediaProfilePhoto } from './entities/family-pedia-profile-photo.entity';
import { ProfilePhotoUploadCompletedReqDTO } from './dto/profile-photo-upload-completed-req.dto';
import { ProfilePhotosResDTO } from './dto/profile-photos-res.dto';
import { CreateProfilePhotoResDTO } from './dto/create-profile-photo-res.dto';
import { FamilyPediaService } from './family-pedia.service';

@Injectable()
export class FamilyPediaServiceImpl implements FamilyPediaService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @InjectRepository(FamilyPedia)
    private pediaRepository: Repository<FamilyPedia>,
    @InjectRepository(FamilyPediaQuestion)
    private questionRepository: Repository<FamilyPediaQuestion>,
    @InjectRepository(FamilyPediaProfilePhoto)
    private profilePhotoRepository: Repository<FamilyPediaProfilePhoto>,
    @Inject(SqsNotificationService)
    private readonly sqsNotificationService: SqsNotificationService,
    @Inject(S3Service)
    private readonly s3Service: S3Service,
  ) {}

  // 같은 가족이라면 사진을 수정할 수 있음
  async createProfilePhoto(
    { familyId }: AuthUserId,
    pediaId: number,
  ): Promise<CreateProfilePhotoResDTO> {
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

      const endpoint = presignedUrl.url
        .replace(/^(https?:\/\/[^\/]+\.com\/)/, '')
        .split('?')[0];

      await this.profilePhotoRepository
        .createQueryBuilder('photo')
        .insert()
        .into(FamilyPediaProfilePhoto)
        .values({
          url: endpoint,
          familyPedia: { ownerId: pediaId },
        })
        .updateEntity(false)
        .execute();

      // 알림은 파일 업로드 완료 후 처리

      return { result: true, presignedUrl: presignedUrl.url, pediaId };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async profilePhotoUploadCompleted(
    { userId, familyId }: AuthUserId,
    { pediaId, url, width, height }: ProfilePhotoUploadCompletedReqDTO,
  ): Promise<BaseResponseDTO> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // pedia owner가 나의 가족인지 확인
      const pediaExist = await this.pediaFamValidate(
        pediaId,
        familyId,
        queryRunner.manager.createQueryBuilder(FamilyPedia, 'pedia'),
      );

      if (!pediaExist) {
        throw new Error('Not authorized to update the profile photo.');
      }

      // 엔드포인트만 넘겨 받는 게 규약이지만, 앱단에서 실수할 가능성 높기에 이중 필터
      const strippedUrl = url.replace(/^\.com\//, '').split('?')[0];

      const updateResult = await queryRunner.manager
        .createQueryBuilder(FamilyPediaProfilePhoto, 'photo')
        .update()
        .where('familyPediaId = :pediaId', { pediaId })
        .andWhere('url = :url', { url: strippedUrl })
        .set({ uploaded: true, width, height })
        .updateEntity(false)
        .execute();

      if (updateResult.affected !== 1) {
        throw new Error('Cannot update the profile photo entity.');
      }

      const updatePediaResult = await queryRunner.manager
        .createQueryBuilder(FamilyPedia, 'pedia')
        .update()
        .where('ownerId = :pediaId', { pediaId })
        .set({ profilePhoto: url })
        .updateEntity(false)
        .execute();

      if (updatePediaResult.affected !== 1) {
        throw new Error('Cannot update the pedia entity.');
      }

      await queryRunner.commitTransaction();

      // 알림
      const sqsDTO = new SqsNotificationReqDTO(
        NotificationType.PEDIA_EDIT_PHOTO,
        { familyId, ownerId: pediaId, editorId: userId },
      );

      this.sqsNotificationService.sendNotification(sqsDTO);

      return { result: true };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      return { result: false, error: e.message };
    } finally {
      await queryRunner.release();
    }
  }

  async findProfilePhotos(
    { familyId }: AuthUserId,
    pediaId: number,
  ): Promise<ProfilePhotosResDTO> {
    try {
      // check if in same family
      const pediaExist = await this.pediaFamValidate(pediaId, familyId);

      if (!pediaExist) {
        throw new Error('Cannot get profile photos of the pedia.');
      }

      const profilePhotos = await this.profilePhotoRepository
        .createQueryBuilder('photo')
        .select()
        .innerJoin('photo.familyPedia', 'pedia', 'pedia.ownerId = :pediaId', {
          pediaId,
        })
        .where('photo.uploaded = true')
        .orderBy('id', 'DESC')
        .getMany();

      if (profilePhotos.length === 0) {
        const defaultPhoto = new FamilyPediaProfilePhoto();

        defaultPhoto.id = 0;
        defaultPhoto.url = process.env.FAMILY_PEDIA_DEFAULT_IMG;
        defaultPhoto.width = 2000;
        defaultPhoto.height = 1500;
        defaultPhoto.uploaded = true;
        defaultPhoto.familyPediaId = pediaId;

        profilePhotos.push(defaultPhoto);
      }

      return { result: true, profilePhotos };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  // 올리는 것은 여러 가족 사용자가 올릴 수 있지만, 삭제는 owner만 가능
  async deleteProfilePhoto(
    { userId }: AuthUserId,
    photoId: number,
  ): Promise<BaseResponseDTO> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // check if exist
      const photo = await queryRunner.manager
        .createQueryBuilder(FamilyPediaProfilePhoto, 'photo')
        .select()
        .innerJoinAndSelect(
          'photo.familyPedia',
          'pedia',
          'pedia.owner.id = :userId',
          { userId },
        )
        .where('photo.id = :photoId', { photoId })
        .getOneOrFail();

      const deleteResult = await queryRunner.manager
        .createQueryBuilder(FamilyPediaProfilePhoto, 'photo')
        .delete()
        .where('id = :photoId', { photoId })
        .andWhere('familyPediaId = :userId', { userId })
        .execute();

      if (deleteResult.affected !== 1) {
        throw new Error('Cannot delete the entity.');
      }

      if (photo.familyPedia.profilePhoto === photo.url) {
        const updateResult = await queryRunner.manager
          .createQueryBuilder(FamilyPedia, 'pedia')
          .update()
          .where('ownerId = :userId', { userId })
          .set({ profilePhoto: process.env.FAMILY_PEDIA_DEFAULT_IMG })
          .updateEntity(false)
          .execute();

        if (updateResult.affected !== 1) {
          throw new Error('Cannot delete update the profile photo page');
        }
      }

      const s3DeleteResult = await this.s3Service.deleteFile(photo.url);

      if (!s3DeleteResult.result) {
        throw new Error('Cannot delete the image from the storage.');
      }

      await queryRunner.commitTransaction();

      return { result: true };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      return { result: false, error: e.message };
    } finally {
      await queryRunner.release();
    }
  }

  /*
    userService에 의해서만 호출됨, sign up user에서 query runner 받아옴
    transaction 역시 sign up에서 handle
  */
  async createFamilyPedia(
    ownerId: number,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const defaultQuestions = [
      '가장 좋아하는 음식이 무엇인가요?',
      '어릴 적 꿈은 무엇이었나요?',
      '요즘 여행 가보고 싶은 나라가 있나요? 어디인가요?',
      '올해 가장 행복했던 일은 무엇인가요?',
      '앞으로 해보고 싶은 것 하나를 꼽아보자면?',
    ];

    // insert new Pedia
    const pediaResult = await queryRunner.manager
      .createQueryBuilder(FamilyPedia, 'FamilyPedia')
      .insert()
      .values({ owner: { id: ownerId } })
      .updateEntity(false)
      .execute();

    if (!pediaResult.raw.insertId) {
      throw new Error('Cannot save the family pedia.');
    }

    // default question bulk insert
    const qInsertQuery = queryRunner.manager
      .createQueryBuilder(FamilyPediaQuestion, 'FamilyPedia')
      .insert()
      .into(FamilyPediaQuestion);

    for (const q of defaultQuestions) {
      qInsertQuery.values({ familyPedia: { ownerId }, question: q });
    }

    await qInsertQuery.execute();
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

  // transaction 하지 않음 => pediaFamValidate 포함 2회 db 접근 (아래 다른 메서드도 동일)
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
      const sqsDTO = new SqsNotificationReqDTO(
        NotificationType.PEDIA_QUESTION_CREATED,
        { ownerId: pediaId, familyId },
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
      const sqsDTO = new SqsNotificationReqDTO(
        NotificationType.PEDIA_QUESTION_EDITTED,
        { ownerId: pediaId, familyId },
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
      const sqsDTO = new SqsNotificationReqDTO(NotificationType.PEDIA_ANSWER, {
        familyId,
        ownerId: userId,
      });

      this.sqsNotificationService.sendNotification(sqsDTO);

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  private async pediaFamValidate(
    pediaId: number,
    familyId: number,
    pediaQueryBuilder = this.pediaRepository.createQueryBuilder('pedia'),
  ): Promise<boolean> {
    const exist = await pediaQueryBuilder
      .select('pedia.ownerId')
      .innerJoin('pedia.owner', 'owner', 'owner.familyId = :familyId', {
        familyId,
      })
      .where('pedia.owner.id = :pediaId', { pediaId })
      .getOne();

    return Boolean(exist);
  }
}

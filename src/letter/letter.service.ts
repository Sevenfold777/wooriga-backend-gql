import { Injectable } from '@nestjs/common';
import { LetterBoxReqDTO } from './dto/letter-box-req.dto';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { EditLetterReqDTO } from './dto/edit-letter-req.dto';
import { LetterReqDTO } from './dto/letter-req.dto';
import { SendLetterReqDTO } from './dto/send-letter-req.dto';
import { LetterGuide } from './entities/letter-guide.entity';
import { LetterResDTO } from './dto/letter-res.dto';
import { LetterBoxResDTO } from './dto/letter-box-res.dto';
import { CreateResDTO } from 'src/common/dto/create-res.dto';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, InsertResult, Repository } from 'typeorm';
import { Letter } from './entities/letter.entity';
import { LetterType } from './constants/letter-type.enum';
import { LetterBoxType } from './constants/letter-box-type.enum';
import { LetterGuideResDTO } from './dto/letter-guide-res.dto';
import { User } from 'src/user/entities/user.entity';
import { SqsNotificationService } from 'src/sqs-notification/sqs-notification.service';
import { NotificationType } from 'src/sqs-notification/constants/notification-type';
import { SqsNotificationProduceDTO } from 'src/sqs-notification/dto/sqs-notification-produce.dto';
import { EditLetterKeptReqDTO } from './dto/edit-letter-kept-req.dto';

@Injectable()
export class LetterService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Letter) private letterRepository: Repository<Letter>,
    @InjectRepository(LetterGuide)
    private guideRepository: Repository<LetterGuide>,
    private readonly sqsNotificationService: SqsNotificationService,
  ) {}

  async sendLetter(
    { userId, familyId }: AuthUserId,
    sendLetterReqDTO: SendLetterReqDTO,
  ): Promise<CreateResDTO> {
    try {
      const {
        title,
        payload,
        emotion,
        isTimeCapsule,
        receiveDate,
        receivers,
        isTemp,
      } = sendLetterReqDTO;

      let letterId: number;

      /**
       * 1. 임시저장
       * 한 번의 요청으로 여러 개의 resolver를 호출하는 gql 특성 활용 (sendLetter + deleteLetter)
       * 현재는 편지 작성 완료시 새로운 편지 엔티티 등록,
       * 임시저장 메세지는 삭제 요청 (임시 저장 수정시 총 2개의 요청)
       */
      if (isTemp) {
        const letter = await this.letterRepository
          .createQueryBuilder('letter')
          .insert()
          .into(Letter)
          .values({
            title,
            payload,
            emotion,
            isTimeCapsule,
            receiveDate: isTimeCapsule ? receiveDate : new Date(),
            sender: { id: userId },
            isTemp,
          })
          .updateEntity(false)
          .execute();

        letterId = letter.raw?.insertId;
      }
      // 2. 실제 전송
      else {
        const insertPromises: {
          promise: Promise<InsertResult>;
          receiverId: number;
        }[] = [];

        // check if sender and receiver in same family
        const receiversFromDB = await this.userRepository
          .createQueryBuilder('user')
          .select('user.id')
          .where('user.id IN(:...receiverIds)', { receiverIds: receivers })
          .andWhere('user.familyId = :familyId', { familyId })
          .getMany();

        // 정책: 한 명이라도 가족 아닌 사용자가 껴 있으면 전체 reject
        if (
          receivers.length !== receiversFromDB.length ||
          receiversFromDB.length === 0
        ) {
          throw new Error('Request with invalid receivers.');
        }

        for (const receiver of receiversFromDB) {
          insertPromises.push({
            promise: this.letterRepository
              .createQueryBuilder('letter')
              .insert()
              .into(Letter)
              .values({
                title,
                payload,
                emotion,
                isTimeCapsule,
                receiveDate: isTimeCapsule ? receiveDate : new Date(),
                sender: { id: userId },
                ...(receiver.id !== -1 && { receiver: { id: receiver.id } }),
                isTemp,
              })
              .updateEntity(false)
              .execute(),
            receiverId: receiver.id,
          });
        }

        const insertResults = await Promise.all(
          insertPromises.map((p) => p.promise),
        );

        for (let i = 0; i < insertPromises.length; i++) {
          const insertResult = insertResults[i];

          letterId = insertResult.raw?.insertId;

          // request notification
          const sqsDTO = new SqsNotificationProduceDTO(
            NotificationType.LETTER_SEND,
            { receiverId: insertPromises[i].receiverId, letterId },
          );

          this.sqsNotificationService.sendNotification(sqsDTO); // AWARE: await 하지 않음
        }
      }

      // 여러 명에게 편지를 동시에 전송한다면, 가장 마지막에 전송한 편지의 id return
      return { result: true, id: letterId };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async readLetter(
    { userId }: AuthUserId,
    id: number,
  ): Promise<BaseResponseDTO> {
    try {
      const updateResult = await this.letterRepository
        .createQueryBuilder('letter')
        .update()
        .where('id = :id', { id })
        .andWhere('receiver.id = :userId', { userId })
        .set({ isRead: true })
        .updateEntity(false)
        .execute();

      if (updateResult.affected !== 1) {
        throw new Error(
          'Cannot update letter status to read. (Cannot update the entity)',
        );
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async editLetter(
    { userId }: AuthUserId,
    editLetterReqDTO: EditLetterReqDTO,
  ): Promise<BaseResponseDTO> {
    // 정책: receiver 수정 불가 => 수정 원할 경우 편지 삭제 후, 해당 사용자를 receiver 설정하여 새로 작성
    try {
      const {
        id,
        title,
        payload,
        emotion,
        isTimeCapsule,
        receiveDate,
        isTemp,
      } = editLetterReqDTO;

      const updateResult = await this.letterRepository
        .createQueryBuilder('letter')
        .update()
        .where('id = :id', { id })
        .andWhere('isRead = :isRead', { isRead: false })
        .andWhere('sender.id = :userId', { userId })
        .set({
          title,
          payload,
          emotion,
          isTimeCapsule,
          receiveDate: isTimeCapsule ? receiveDate : new Date(),
          isTemp,
        })
        .updateEntity(false)
        .execute();

      if (updateResult.affected !== 1) {
        throw new Error('Cannot edit letter. (Cannot update the entity)');
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async deleteLetter(
    { userId }: AuthUserId,
    id: number,
  ): Promise<BaseResponseDTO> {
    const queryRunner = this.dataSource.createQueryRunner();

    queryRunner.connect();
    queryRunner.startTransaction();

    try {
      const deleteResult = await this.letterRepository
        .createQueryBuilder('letter')
        .delete()
        .from(Letter)
        .where('id = :id', { id })
        .andWhere('isRead = :isRead', { isRead: false })
        .andWhere('sender.id = :userId', { userId })
        .execute();

      if (deleteResult.affected !== 1) {
        throw new Error('Cannot delete the letter.');
      }

      await queryRunner.commitTransaction();

      return { result: true };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      return { result: false, error: e.message };
    } finally {
      queryRunner.release();
    }
  }

  async findLetter(
    { userId }: AuthUserId,
    { id, type }: LetterReqDTO,
  ): Promise<LetterResDTO> {
    try {
      const query = this.letterRepository.createQueryBuilder('letter').select();

      switch (type) {
        case LetterType.SENT:
          query
            .leftJoinAndSelect('letter.receiver', 'receiver')
            .where('id = :id', { id })
            .andWhere('letter.sender.id = :userId', { userId });
          break;

        case LetterType.RECEIVED:
          query
            .leftJoinAndSelect('letter.sender', 'sender')
            .where('id = :id', { id })
            .andWhere('letter.receiver.id = :userId', { userId });
          break;

        default:
          throw new Error('Invalid letter type requested.');
      }

      const letter = await query.getOneOrFail();

      return { result: true, letter };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async findLetterBox(
    { userId }: AuthUserId,
    { type, boxType, take, prev }: LetterBoxReqDTO,
  ): Promise<LetterBoxResDTO> {
    try {
      const tcMaxDate = new Date(
        new Date().getTime() - 1000 * 60 * 60 * 24 * 3,
      );

      const query = this.letterRepository.createQueryBuilder('letter').select();

      switch (type) {
        case LetterType.SENT:
          query
            .leftJoinAndSelect('letter.receiver', 'receiver')
            .leftJoinAndSelect(
              'letter.sender',
              'sender',
              'sender.id = :userId',
              { userId },
            )
            .orderBy('updatedAt', 'DESC');
          break;

        case LetterType.RECEIVED:
          query
            .leftJoinAndSelect(
              'letter.receiver',
              'receiver',
              'receiver.id = :userId',
              { userId },
            )
            .leftJoinAndSelect('letter.sender', 'sender')
            .orderBy('receiveDate', 'DESC');
          break;
        default:
          throw new Error('Invalid letter type requested.');
      }

      switch (boxType) {
        case LetterBoxType.ALL:
          query.where('receiveDate <= :now', { now: new Date() });
          break;

        case LetterBoxType.TIME_CAPSULE:
          query
            .where('isTimeCapsule = :isTC', { isTC: true })
            .andWhere('receiveDate >= :tcMaxDate', { tcMaxDate });

          if (type === LetterType.SENT) {
            query.andWhere;
          }
          break;

        case LetterBoxType.KEPT:
          query.where('letter.kept = :kept', { kept: true });
          break;

        default:
          throw new Error('Invalid box type requested.');
      }

      const letters = await query
        .skip(take * prev)
        .take(take)
        .execute();

      return { result: true, letters };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async editLetterKept(
    { userId }: AuthUserId,
    { id, kept }: EditLetterKeptReqDTO,
  ): Promise<BaseResponseDTO> {
    try {
      const updateResult = await this.letterRepository
        .createQueryBuilder('letter')
        .update()
        .where('id = :id', { id })
        .andWhere('receiver.id = :userId', { userId })
        .set({ kept })
        .updateEntity(false)
        .execute();

      if (updateResult.affected !== 1) {
        throw new Error('Cannot edit letter kept. (Cannot update the entity)');
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getLetterGuide(): Promise<LetterGuideResDTO> {
    try {
      const letterGuide = await this.guideRepository
        .createQueryBuilder('letter')
        .where('letter.isPinned = :pin', { pin: true })
        .orderBy('updatedAt', 'DESC')
        .addOrderBy('id', 'DESC')
        .getOneOrFail();

      return { result: true, letterGuide };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }
}

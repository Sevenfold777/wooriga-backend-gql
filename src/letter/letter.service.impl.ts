import { Inject, Injectable } from '@nestjs/common';
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
import { SqsNotificationReqDTO } from 'src/sqs-notification/dto/sqs-notification-req.dto';
import { EditLetterKeptReqDTO } from './dto/edit-letter-kept-req.dto';
import { LetterService } from './letter.service';

@Injectable()
export class LetterServiceImpl implements LetterService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Letter) private letterRepository: Repository<Letter>,
    @InjectRepository(LetterGuide)
    private guideRepository: Repository<LetterGuide>,
    @Inject(SqsNotificationService)
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
          const sqsDTO = new SqsNotificationReqDTO(
            NotificationType.LETTER_SEND,
            {
              receiverId: insertPromises[i].receiverId,
              letterId,
              familyId,
              isTimeCapsule,
            },
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

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  // sendLetter에서는 가족한테만 보낼 수 있는지 확인하지만,
  // findLetter는 자신한테 온 편지는 전부 볼 수 있도록 sender 가족 체크 하지 않음
  // 가족이었다가 탈퇴한 회원, 가족을 바꾼 회원 등에게 받은 편지도 계속 확인할 수 있도록 정책 구성
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
            .where('letter.id = :id', { id })
            .andWhere('letter.sender.id = :userId', { userId });
          break;

        case LetterType.RECEIVED:
          query
            .leftJoinAndSelect('letter.sender', 'sender')
            .where('letter.id = :id', { id })
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
      let res: LetterBoxResDTO;

      // box type 기준으로 1차 분기 (각 메서드 안에서 letter type으로 2차 분기)
      switch (boxType) {
        case LetterBoxType.ALL:
          res = await this.findLetterAllBox(userId, type, take, prev);
          break;

        case LetterBoxType.TIME_CAPSULE:
          res = await this.findTimeCapsuleBox(userId, type, take, prev);
          break;

        case LetterBoxType.KEPT:
          res = await this.findLetterKeptBox(userId, type, take, prev);
          break;

        default:
          throw new Error('Request with invalid box type.');
      }

      return res;
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async findLetterAllBox(
    userId: number,
    type: LetterType,
    take: number,
    prev: number,
  ): Promise<LetterBoxResDTO> {
    try {
      const query = this.letterRepository.createQueryBuilder('letter').select();

      switch (type) {
        case LetterType.SENT:
          query
            .leftJoinAndSelect('letter.receiver', 'receiver')
            .where('letter.senderId = :userId', { userId })
            .orderBy('isTemp', 'DESC')
            .addOrderBy('letter.updatedAt', 'DESC')
            .addOrderBy('letter.id', 'DESC');
          break;

        case LetterType.RECEIVED:
          query
            .leftJoinAndSelect('letter.sender', 'sender')
            .where('letter.receiverId = :userId', { userId })
            .andWhere('receiveDate <= :now', { now: new Date() })
            .orderBy('receiveDate', 'DESC')
            .addOrderBy('letter.id', 'DESC');
          break;

        default:
          throw new Error('Request with invalid letter type.');
      }

      const letters = await query
        .offset(take * prev)
        .limit(take)
        .getMany();

      return { result: true, letters };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async findTimeCapsuleBox(
    userId: number,
    type: LetterType,
    take: number,
    prev: number,
  ): Promise<LetterBoxResDTO> {
    try {
      const query = this.letterRepository.createQueryBuilder('letter').select();

      switch (type) {
        case LetterType.SENT:
          query
            .leftJoinAndSelect('letter.receiver', 'receiver')
            .where('letter.senderId = :userId', { userId })
            .andWhere('isTimeCapsule = true')
            .andWhere('isTemp = false')
            .orderBy('receiveDate', 'DESC')
            .addOrderBy('letter.updatedAt', 'DESC')
            .addOrderBy('letter.id', 'DESC');
          break;

        case LetterType.RECEIVED:
          query
            .leftJoinAndSelect('letter.sender', 'sender')
            .where('letter.receiverId = :userId', { userId })
            .andWhere('isTimeCapsule = true')
            .orderBy('receiveDate', 'DESC')
            .addOrderBy('letter.id', 'DESC');
          break;

        default:
          throw new Error('Request with invalid letter type.');
      }

      const letters = await query
        .offset(take * prev)
        .limit(take)
        .getMany();

      return { result: true, letters };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async findLetterKeptBox(
    userId: number,
    type: LetterType,
    take: number,
    prev: number,
  ): Promise<LetterBoxResDTO> {
    try {
      const query = this.letterRepository.createQueryBuilder('letter').select();

      switch (type) {
        case LetterType.RECEIVED:
          query
            .leftJoinAndSelect('letter.sender', 'sender')
            .where('letter.receiverId = :userId', { userId })
            .andWhere('receiveDate <= :now', { now: new Date() })
            .andWhere('letter.kept = true')
            .andWhere('letter.isRead = true')
            .orderBy('receiveDate', 'DESC');
          break;

        case LetterType.SENT:
          throw new Error(
            'Request with invalid letter type. (No Kept letter box for SENT)',
          );

        default:
          throw new Error('Request with invalid letter type.');
      }

      const letters = await query
        .offset(take * prev)
        .limit(take)
        .getMany();

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

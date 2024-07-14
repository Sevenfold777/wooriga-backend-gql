import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { MessageComment } from 'src/message/entities/message-comment.entity';
import { MessageFamily } from 'src/message/entities/message-family.entity';
import { MessageKeep } from 'src/message/entities/message-keep.entity';
import { Message } from 'src/message/entities/message.entity';
import { NotificationType } from 'src/sqs-notification/constants/notification-type';
import { SqsNotificationReqDTO } from 'src/sqs-notification/dto/sqs-notification-req.dto';
import { DataSource, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { CountResDTO } from '../dto/count-res.dto';
import { CreateMessageReqDTO } from '../dto/create-message-req.dto';
import { EditMessageReqDTO } from '../dto/edit-message-req.dto';
import { Family } from 'src/family/entities/family.entity';
import { SqsNotificationService } from 'src/sqs-notification/sqs-notification.service';
import { MessageListResDTO } from '../dto/message-list-res.dto';
import { MessageWithSent } from '../dto/message-with-sent.dto';
import { MessageWithStat } from '../dto/message-with-stat.dto';
import { MessageDetailResDTO } from '../dto/message-detail-res.dto';
import { MessageService } from './message.service';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';

@Injectable()
export class MessageServiceImpl implements MessageService {
  private logger = new Logger('Admin Message Service');

  constructor(
    @Inject(SqsNotificationService)
    private readonly sqsNotificationService: SqsNotificationService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(MessageComment)
    private readonly messageCommentRepository: Repository<MessageComment>,
    @InjectRepository(MessageKeep)
    private readonly messageKeepRepository: Repository<MessageKeep>,
  ) {}

  async getMsgList({
    take,
    prev,
  }: PaginationReqDTO): Promise<MessageListResDTO> {
    try {
      const sentCountAlias = 'sentCount';

      const { raw: messagesRaw, entities: messageEntities } =
        await this.messageRepository
          .createQueryBuilder('msg')
          .select()
          .addSelect('COUNT(msgFam.id)', sentCountAlias)
          .leftJoin('message_family', 'msgFam', 'msgFam.messageId = msg.id')
          .groupBy('msg.id')
          .orderBy('msg.id', 'DESC')
          .offset(take * prev)
          .limit(take)
          .getRawAndEntities();

      const messageWithSentList: MessageWithSent[] = [];

      for (let i = 0; i < messageEntities.length; i++) {
        const messageWithSent = new MessageWithSent();

        Object.assign(messageWithSent, messageEntities[i]);
        messageWithSent.sentCount = messagesRaw[i][sentCountAlias];

        messageWithSentList.push(messageWithSent);
      }

      return { result: true, messageWithSents: messageWithSentList };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getMsgDetail(id: number): Promise<MessageDetailResDTO> {
    try {
      // 1. message info (TODO: message list와 중복, front와 합의 후 생략)
      const sentCountAlias = 'sentCount';

      const { raw: messagesRaw, entities: messageEntities } =
        await this.messageRepository
          .createQueryBuilder('msg')
          .select()
          .addSelect('COUNT(msgFam.id)', sentCountAlias)
          .leftJoin('message_family', 'msgFam', 'msgFam.messageId = msg.id')
          .where('msg.id = :id', { id })
          .groupBy('msg.id')
          .orderBy('msg.id', 'DESC')
          .limit(1)
          .getRawAndEntities();

      // 2. comments, commented users
      const comments = await this.messageCommentRepository
        .createQueryBuilder('comment')
        .select('comment.id')
        .addSelect('comment.authorId')
        .innerJoin('comment.message', 'msgFam', 'msgFam.messageId = :id', {
          id,
        })
        .getMany();

      const commentsCount = comments.length;

      const authors = new Set(comments.map((comment) => comment.authorId));
      const authorsCount = authors.size;

      // 3. keeps count
      const keepsCount = await this.messageKeepRepository
        .createQueryBuilder('keep')
        .innerJoin('keep.message', 'msgFam', 'msgFam.messageId = :id', {
          id,
        })
        .getCount();

      // assign return dto
      const messageWithStat = new MessageWithStat();

      Object.assign(messageWithStat, messageEntities[0]);
      messageWithStat.sentCount = messagesRaw[0][sentCountAlias];

      messageWithStat.commentsCount = commentsCount;
      messageWithStat.commentAuthorsCount = authorsCount;
      messageWithStat.keepsCount = keepsCount;

      return { result: true, messageWithStat };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async editMsg(
    editMessageReqDTO: EditMessageReqDTO,
  ): Promise<BaseResponseDTO> {
    try {
      const { id } = editMessageReqDTO;

      const updateResult = await this.messageRepository
        .createQueryBuilder('message')
        .update()
        .where('message.id = :id', { id })
        .set({ ...editMessageReqDTO })
        .updateEntity(false)
        .execute();

      if (updateResult.affected !== 1) {
        throw new Error('Cannot update the message.');
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async deleteMsg(id: number): Promise<BaseResponseDTO> {
    try {
      const deleteResult = await this.messageRepository
        .createQueryBuilder('message')
        .delete()
        .where('message.id = :id', { id })
        .execute();

      if (deleteResult.affected !== 1) {
        throw new Error('Cannot delete the letter.');
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async sendMsg(id: number): Promise<BaseResponseDTO> {
    const BATCH_ITEMS_COUNT = 100;
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const today = new Date(new Date().toLocaleDateString('ko-KR'));
      const tomorrow = new Date(today.getTime() + 1000 * 60 * 60 * 24);

      // 1. message 검색 => 생략 (argument input 사용)

      // 2. messageFamily 검색
      const familiesToSend = await queryRunner.manager
        .createQueryBuilder(Family, 'family')
        .select('family.id')
        .leftJoin(
          'family.messages',
          'messageFam',
          'messageFam.receiveDate >= :today and messageFam.receiveDate < :tomorrow',
          { today, tomorrow },
        )
        .where('messageFam.id IS NULL')
        .getMany();

      // 3. messageFamily builk insert (500명 단위 Batch로 나눠서 insert 및 FCM request)
      for (
        let i = 0;
        i < Math.ceil(familiesToSend.length / BATCH_ITEMS_COUNT);
        i++
      ) {
        const familiesByBatch = familiesToSend.slice(
          BATCH_ITEMS_COUNT * i,
          BATCH_ITEMS_COUNT * (i + 1),
        );

        const insertValues: QueryDeepPartialEntity<MessageFamily>[] =
          familiesByBatch.map((family) => ({
            receivedAt: new Date(),
            message: { id },
            family: { id: family.id },
          }));

        const insertResult = await queryRunner.manager
          .createQueryBuilder(MessageFamily, 'msgFam')
          .insert()
          .values(insertValues)
          .updateEntity(false)
          .execute();

        insertResult.raw?.affectedRows === 0
          ? this.logger.error('No messagefamilies inserted.', insertResult)
          : this.logger.log(insertResult);

        // 4. 알림: sqs notif 요청
        const sqsDTO = new SqsNotificationReqDTO(
          NotificationType.MESSAGE_TODAY,
          { familyIds: familiesByBatch.map((f) => f.id) },
        );

        this.sqsNotificationService.sendNotification(sqsDTO);
      }

      await queryRunner.commitTransaction();

      return { result: true };
    } catch (e) {
      await queryRunner.rollbackTransaction();

      return { result: false, error: e };
    } finally {
      await queryRunner.release();
    }
  }

  async createMsg({ payload, emotion, uploadAt, linkTo }: CreateMessageReqDTO) {
    try {
      await this.messageRepository
        .createQueryBuilder('message')
        .insert()
        .values({ payload, emotion, uploadAt, linkTo })
        .updateEntity(false)
        .execute();

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getMsgCommentCreateCount(): Promise<CountResDTO> {
    try {
      const todayBegin = new Date(new Date().toLocaleDateString('ko-KR'));

      const commentsCount = await this.messageCommentRepository
        .createQueryBuilder('comment')
        .where('comment.createdAt >= :todayBegin', { todayBegin })
        .getCount();

      return { result: true, count: commentsCount };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getMsgKeepCount(): Promise<CountResDTO> {
    try {
      const todayBegin = new Date(new Date().toLocaleDateString('ko-KR'));

      const keepsCount = await this.messageKeepRepository
        .createQueryBuilder('keep')
        .where('keep.createdAt >= :todayBegin', { todayBegin })
        .getCount();

      return { result: true, count: keepsCount };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getMsgCommentUserCount(): Promise<CountResDTO> {
    try {
      const todayBegin = new Date(new Date().toLocaleDateString('ko-KR'));

      const commentedUsers = await this.messageCommentRepository
        .createQueryBuilder('comment')
        .select('comment.author.id')
        .where('comment.createdAt >= :todayBegin', { todayBegin })
        .groupBy('comment.author.id')
        .getMany();

      return { result: true, count: commentedUsers.length };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getMsgCommentFamilyCount(includeAdmin: boolean): Promise<CountResDTO> {
    try {
      const todayBegin = new Date(new Date().toLocaleDateString('ko-KR'));

      const query = this.messageCommentRepository
        .createQueryBuilder('comment')
        .select('family.id')
        .innerJoin('comment.author', 'author')
        .innerJoin('author.family', 'family')
        .where('comment.createdAt >= :todayBegin', { todayBegin });

      if (!includeAdmin) {
        query.andWhere('family.id not IN (:...adminFamilies)', {
          adminFamilies: JSON.parse(process.env.ADMIN_FAMILY_LIST),
        });
      }

      const commentedFamilies = await query
        .groupBy('comment.author.id')
        .getMany();

      return { result: true, count: commentedFamilies.length };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }
}

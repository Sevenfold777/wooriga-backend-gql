import { SqsNotificationService } from './../sqs-notification/sqs-notification.service';
import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { MessageComment } from './entities/message-comment.entity';
import { MessageFamily } from './entities/message-family.entity';
import { MessageKeep } from './entities/message-keep.entity';
import { DataSource, Repository } from 'typeorm';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { CreateMsgCommentReqDTO } from './dto/create-message-comment-req.dto';
import { MsgCommentReqDTO } from './dto/message-comment-req.dto';
import { MsgResDTO } from './dto/message-res.dto';
import { MsgCommentsResDTO } from './dto/message-comments-res.dto';
import { CommentStatus } from 'src/common/constants/comment-status.enum';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { MsgsResDTO } from './dto/messages-res.dto';
import { CreateResDTO } from 'src/common/dto/create-res.dto';
import { SqsNotificationReqDTO } from 'src/sqs-notification/dto/sqs-notification-req.dto';
import { NotificationType } from 'src/sqs-notification/constants/notification-type';

@Injectable()
export class MessageService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @InjectRepository(MessageFamily)
    private messageFamRepository: Repository<MessageFamily>,
    @InjectRepository(MessageComment)
    private commentRepository: Repository<MessageComment>,
    @InjectRepository(MessageKeep)
    private keepRepository: Repository<MessageKeep>,
    private readonly sqsNotificationService: SqsNotificationService,
  ) {}

  async findMsgLatest({ userId, familyId }: AuthUserId): Promise<MsgResDTO> {
    try {
      /**
       * - join의 대상이 그렇게 많지 않기 때문에 multiple query로 나누지 않음
       * - join에 조건 주어 성능 향상 노력
       * - 여러 개의 message query 할 때 대비 (2*N 방지)
       */

      const message = await this.messageFamRepository
        .createQueryBuilder('msgFam')
        .select()
        .addSelect('keep.id')
        .addSelect('comment.id')
        .innerJoinAndSelect('msgFam.message', 'message')
        .leftJoin('msgFam.keeps', 'keep', 'keep.user.id = :userId', { userId }) // to count
        .leftJoin('msgFam.comments', 'comment') // to count
        .where('msgFam.family.id = :familyId', { familyId })
        .andWhere('msgFam.receivedAt <= :now', { now: new Date() })
        .orderBy('msgFam.receivedAt', 'DESC')
        .getOneOrFail();

      message.isKept = Boolean(message.keeps.length);
      message.commentsCount = message.comments.length;

      return { result: true, messageFam: message };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async findMsg(
    { userId, familyId }: AuthUserId,
    messageFamId: number,
  ): Promise<MsgResDTO> {
    try {
      const message = await this.messageFamRepository
        .createQueryBuilder('msgFam')
        .select()
        .addSelect('keep.id')
        .addSelect('comment.id')
        .innerJoinAndSelect('msgFam.message', 'message')
        .leftJoin('msgFam.keeps', 'keep', 'keep.user.id = :userId', { userId }) // to count
        .leftJoin('msgFam.comments', 'comment') // to count
        .where('msgFam.id = :messageFamId', { messageFamId })
        .andWhere('msgFam.family.id = :familyId', { familyId })
        .andWhere('msgFam.receivedAt <= :now', { now: new Date() })
        .getOneOrFail();

      message.isKept = Boolean(message.keeps.length);
      message.commentsCount = message.comments.length;

      return { result: true, messageFam: message };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async findMsgs(
    { familyId }: AuthUserId,
    { take, prev }: PaginationReqDTO,
  ): Promise<MsgsResDTO> {
    try {
      const messages = await this.messageFamRepository
        .createQueryBuilder('msgFam')
        .select()
        .innerJoinAndSelect('msgFam.message', 'message')
        .where('msgFam.receivedAt <= :now', { now: new Date() })
        .andWhere('msgFam.family.id = :familyId', { familyId })
        .orderBy('msgFam.receivedAt', 'DESC')
        .offset(take * prev)
        .limit(take)
        .getMany();

      return { result: true, messageFams: messages };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  /** keep 관련 */

  async findMsgsKept(
    { userId, familyId }: AuthUserId,
    { prev, take }: PaginationReqDTO,
  ): Promise<MsgsResDTO> {
    try {
      const keeps = await this.keepRepository
        .createQueryBuilder('keep')
        .select()
        .innerJoinAndSelect(
          'keep.message',
          'msgFam',
          'msgFam.family.id = :familyId',
          { familyId },
        )
        .innerJoinAndSelect('msgFam.message', 'message')
        .where('keep.user.id = :userId', { userId })
        .orderBy('msgFam.receivedAt', 'DESC')
        .limit(take)
        .offset(take * prev)
        .getMany();

      const messages = keeps.map((k) => {
        k.message.isKept = true;
        return k.message;
      });

      return { result: true, messageFams: messages };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async keepMsg(
    { userId, familyId }: AuthUserId,
    messageFamId: number,
  ): Promise<BaseResponseDTO> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const msgFamExist = await this.msgFamValidate(
        messageFamId,
        familyId,
        queryRunner.manager.createQueryBuilder(MessageFamily, 'msgFam'),
      );

      if (!msgFamExist) {
        throw new Error('Cannot keep given message family.');
      }

      const keepExist = await queryRunner.manager
        .createQueryBuilder(MessageKeep, 'keep')
        .select('keep.id')
        .innerJoin('keep.message', 'message', 'message.id = :messageFamId', {
          messageFamId,
        })
        .where('keep.user.id = :userId', { userId })
        .getOne();

      if (keepExist) {
        throw new Error('Already kept message.');
      }

      await queryRunner.manager
        .createQueryBuilder(MessageKeep, 'keep')
        .insert()
        .values({
          user: { id: userId },
          message: { id: messageFamId },
        })
        .updateEntity(false)
        .execute();

      await queryRunner.commitTransaction();

      return { result: true };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      return { result: false, error: e.message };
    } finally {
      await queryRunner.release();
    }
  }

  async unkeepMsg(
    { userId, familyId }: AuthUserId,
    messageFamId: number,
  ): Promise<BaseResponseDTO> {
    try {
      const msgFamExist = await this.msgFamValidate(messageFamId, familyId);

      if (!msgFamExist) {
        throw new Error('Cannot unkeep given message family.');
      }

      const deleteResult = await this.keepRepository
        .createQueryBuilder('keep')
        .delete()
        .from(MessageKeep)
        .where('message.id = :messageFamId', { messageFamId })
        .andWhere('user.id = :userId', { userId })
        .execute();

      if (deleteResult.affected !== 1) {
        throw new Error('Cannot unkeep message. (Cannot delete MessageKeep.)');
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  /** comment 관련 */

  async findMsgComments(
    { familyId }: AuthUserId,
    { messageFamId, take, prev }: MsgCommentReqDTO,
  ): Promise<MsgCommentsResDTO> {
    try {
      const msgFamExist = await this.msgFamValidate(messageFamId, familyId);

      if (!msgFamExist) {
        throw new Error('Cannot access to given message family.');
      }

      const comments = await this.commentRepository
        .createQueryBuilder('comment')
        .select()
        .innerJoinAndSelect('comment.author', 'author')
        .where('comment.message.id = :messageFamId', { messageFamId })
        .andWhere('comment.status = :status', { status: CommentStatus.ACTIVE })
        .orderBy('comment.createdAt', 'DESC')
        .limit(take)
        .offset(take * prev)
        .getMany();

      return { result: true, comments };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async createMsgComment(
    { userId, familyId }: AuthUserId,
    { messageFamId, payload }: CreateMsgCommentReqDTO,
  ): Promise<CreateResDTO> {
    try {
      const msgFamExist = await this.msgFamValidate(messageFamId, familyId);

      if (!msgFamExist) {
        throw new Error('Cannot comment on the given message family.');
      }

      const insertResult = await this.commentRepository
        .createQueryBuilder('comment')
        .insert()
        .into(MessageComment)
        .values({
          message: { id: messageFamId },
          payload,
          author: { id: userId },
        })
        .updateEntity(false)
        .execute();

      const commentId = insertResult.raw?.insertId;

      // 알림: 댓글 알림
      const commentPreview =
        payload.length > 10 ? payload.slice(0, 10) + '...' : payload;

      const sqsDTO = new SqsNotificationReqDTO(
        NotificationType.COMMENT_MESSAGE,
        { familyId, messageFamId, authorId: userId, commentPreview },
      );

      this.sqsNotificationService.sendNotification(sqsDTO);

      return { result: true, id: commentId };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  /**
   * delete comment는 messageFamily familyId validation하지 않음
   * 자신이 작성한 댓글은 삭제 가능
   */
  async deleteMsgComment(
    { userId }: AuthUserId,
    commentId: number,
  ): Promise<BaseResponseDTO> {
    try {
      const udpateResult = await this.commentRepository
        .createQueryBuilder('comment')
        .update()
        .where('id = :commentId', { commentId })
        .andWhere('author.id = :userId', { userId })
        .set({ status: CommentStatus.DELETED })
        .updateEntity(false)
        .execute();

      if (udpateResult.affected !== 1) {
        throw new Error('Cannot update comment status to DELETED.');
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async msgFamValidate(
    messageFamId: number,
    familyId: number,
    msgFamQueryBuilder = this.messageFamRepository.createQueryBuilder('msgFam'),
  ): Promise<boolean> {
    /* getExist보다 성능 이점 */
    const exist = await msgFamQueryBuilder
      .select('msgFam.id')
      .where('msgFam.id = :messageFamId', { messageFamId })
      .andWhere('msgFam.familyId = :familyId', { familyId })
      .getOne();

    return Boolean(exist);
  }
}

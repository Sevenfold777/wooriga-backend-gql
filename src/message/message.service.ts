import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
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

@Injectable()
export class MessageService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    @InjectRepository(MessageFamily)
    private messageFamRepository: Repository<MessageFamily>,
    @InjectRepository(MessageComment)
    private commentRepository: Repository<MessageComment>,
    @InjectRepository(MessageKeep)
    private keepRepository: Repository<MessageKeep>,
  ) {}

  async findMsgLatest({ userId, familyId }: AuthUserId): Promise<MsgResDTO> {
    try {
      // TODO: left join 3개 Vs. Multiple Queries (test 해보기)
      const message = await this.messageFamRepository
        .createQueryBuilder('msgFam')
        .select()
        .addSelect('keep.id')
        .addSelect('comment.id')
        .leftJoinAndSelect('msgFam.message', 'message')
        .leftJoin('msgFam.keeps', 'keep', 'keep.user.id = :userId', { userId }) // to count
        .leftJoin('msgFam.comments', 'comment') // to count
        .where('msgFam.family.id = :familyId', { familyId })
        .andWhere('receiveDate <= :now', { now: new Date() })
        .orderBy('receiveDate', 'DESC')
        .getOneOrFail();

      message.isKept = Boolean(message.keeps.length);
      message.commentsCount = message.comments.length;

      console.log(message);

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
        .leftJoinAndSelect('msgFam.message', 'message')
        .leftJoin('msgFam.keeps', 'keep', 'keep.user.id = :userId', { userId }) // to count
        .leftJoin('msgFam.comments', 'comment') // to count
        .where('msgFam.id = :messageFamId', { messageFamId })
        .andWhere('msgFam.family.id = :familyId', { familyId })
        .andWhere('receiveDate <= :now', { now: new Date() })
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
        .leftJoinAndSelect('msgFam.message', 'message')
        .where('receiveDate <= :now', { now: new Date() })
        .andWhere('msgFam.family.id = :familyId', { familyId })
        .orderBy('receiveDate', 'DESC')
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
          'messageFam',
          'messageFam.family.id = :familyId',
          { familyId },
        )
        .innerJoinAndSelect('messageFam.message', 'message')
        .where('keep.user.id = :userId', { userId })
        .limit(take)
        .offset(take * prev)
        .getMany();

      return { result: true, messageFams: keeps.map((k) => k.message) };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async keepMsg(
    { userId, familyId }: AuthUserId,
    messageFamId: number,
  ): Promise<BaseResponseDTO> {
    try {
      const exist = await this.keepRepository
        .createQueryBuilder('keep')
        .select()
        .where('keep.message.id = :messageFamId', { messageFamId })
        .andWhere('keep.user.id = :userId', { userId })
        .getExists();

      if (exist) {
        throw new Error('Already kept message.');
      }

      await this.keepRepository
        .createQueryBuilder('keep')
        .insert()
        .into(MessageKeep)
        .values({
          user: { id: userId },
          message: { id: messageFamId },
        })
        .updateEntity(false)
        .execute();

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async unkeepMsg(
    { userId, familyId }: AuthUserId,
    messageFamId: number,
  ): Promise<BaseResponseDTO> {
    try {
      const deleteResult = await this.keepRepository
        .createQueryBuilder('keep')
        .delete()
        .from(MessageKeep)
        .where('message.id = :messageFamId', { messageFamId })
        // .andWhere('message.family.id = :familyId', { familyId })
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
      const comments = await this.commentRepository
        .createQueryBuilder('comment')
        .select()
        .leftJoinAndSelect('comment.author', 'author')
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
  ): Promise<BaseResponseDTO> {
    try {
      await this.commentRepository
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

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async deleteMsgComment(
    { userId, familyId }: AuthUserId,
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
}

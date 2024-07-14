import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { CreateMsgCommentReqDTO } from './dto/create-message-comment-req.dto';
import { MsgCommentReqDTO } from './dto/message-comment-req.dto';
import { MsgResDTO } from './dto/message-res.dto';
import { MsgCommentsResDTO } from './dto/message-comments-res.dto';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { MsgsResDTO } from './dto/messages-res.dto';
import { CreateResDTO } from 'src/common/dto/create-res.dto';

export interface MessageService {
  findMsgLatest(user: AuthUserId): Promise<MsgResDTO>;

  findMsg(user: AuthUserId, messageFamId: number): Promise<MsgResDTO>;

  findMsgs(
    user: AuthUserId,
    paginationDTO: PaginationReqDTO,
  ): Promise<MsgsResDTO>;

  /* keep 관련 */

  findMsgsKept(
    user: AuthUserId,
    paginationDTO: PaginationReqDTO,
  ): Promise<MsgsResDTO>;

  keepMsg(user: AuthUserId, messageFamId: number): Promise<BaseResponseDTO>;

  unkeepMsg(user: AuthUserId, messageFamId: number): Promise<BaseResponseDTO>;

  /* comment 관련 */

  findMsgComments(
    user: AuthUserId,
    reqDTO: MsgCommentReqDTO,
  ): Promise<MsgCommentsResDTO>;

  createMsgComment(
    user: AuthUserId,
    reqDTO: CreateMsgCommentReqDTO,
  ): Promise<CreateResDTO>;

  /**
   * delete comment는 messageFamily familyId validation하지 않음
   * 자신이 작성한 댓글은 삭제 가능
   */
  deleteMsgComment(
    { userId }: AuthUserId,
    commentId: number,
  ): Promise<BaseResponseDTO>;
}

export const MessageService = Symbol('MessageService');

import { Args, Int, Mutation, Resolver } from '@nestjs/graphql';
import { MessageService } from './message.service';
import { Message } from './entities/message.entity';
import { Query } from '@nestjs/graphql';
import { MsgResDTO } from './dto/message-res.dto';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { MessageComment } from './entities/message-comment.entity';
import { MsgCommentReqDTO } from './dto/message-comment-req.dto';
import { CreateMsgCommentReqDTO } from './dto/create-message-comment-req.dto';

@Resolver(() => Message)
export class MessageResolver {
  constructor(private readonly messageService: MessageService) {}

  /**
   * message와 messageFamily의 혼동을 피하기 위해
   * 예외적으로 Arg 선언시 id => messageFamId 사용 (DTO도 마찬가지)
   */

  @Query(() => MsgResDTO)
  findMsgLatest(@AuthUser() user: AuthUserId): Promise<MsgResDTO> {
    return null;
  }

  @Query(() => MsgResDTO)
  findMsg(
    @AuthUser() user: AuthUserId,
    @Args('messageFamId', { type: () => Int }) messageFamId: number,
  ): Promise<MsgResDTO[]> {
    return null;
  }

  @Query(() => [MsgResDTO])
  findMsgs(
    @AuthUser() user: AuthUserId,
    @Args('prev', { type: () => Int }) prev: number,
  ): Promise<MsgResDTO[]> {
    return null;
  }

  /** keep 관련 */

  @Query(() => [MsgResDTO])
  findMsgsKept(
    @AuthUser() user: AuthUserId,
    @Args('prev', { type: () => Int }) prev: number,
  ): Promise<MsgResDTO[]> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  keepMsg(
    @AuthUser() user: AuthUserId,
    @Args('messageFamId', { type: () => Int }) messageFamId: number,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  unkeepMsg(
    @AuthUser() user: AuthUserId,
    @Args('messageFamId', { type: () => Int }) messageFamId: number,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  /** comment 관련 */

  @Query(() => [MessageComment])
  findMsgComments(
    @AuthUser() user: AuthUserId,
    @Args('reqDTO') msgCommentReqDTO: MsgCommentReqDTO,
  ): Promise<MessageComment[]> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  createMsgComment(
    @AuthUser() user: AuthUserId,
    @Args('reqDTO') createMsgCommentReqDTO: CreateMsgCommentReqDTO,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  deleteMsgComment(
    @AuthUser() user: AuthUserId,
    @Args('commentId', { type: () => Int }) commentId: number,
  ): Promise<BaseResponseDTO> {
    return null;
  }
}

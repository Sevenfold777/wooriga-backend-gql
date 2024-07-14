import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { CountResDTO } from '../dto/count-res.dto';
import { CreateMessageReqDTO } from '../dto/create-message-req.dto';
import { EditMessageReqDTO } from '../dto/edit-message-req.dto';
import { MessageListResDTO } from '../dto/message-list-res.dto';
import { MessageDetailResDTO } from '../dto/message-detail-res.dto';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';

export interface MessageService {
  getMsgList(paginationDTO: PaginationReqDTO): Promise<MessageListResDTO>;

  getMsgDetail(id: number): Promise<MessageDetailResDTO>;

  editMsg(editMessageReqDTO: EditMessageReqDTO): Promise<BaseResponseDTO>;

  deleteMsg(id: number): Promise<BaseResponseDTO>;

  sendMsg(id: number): Promise<BaseResponseDTO>;

  createMsg(reqDTO: CreateMessageReqDTO): Promise<BaseResponseDTO>;

  getMsgCommentCreateCount(): Promise<CountResDTO>;

  getMsgKeepCount(): Promise<CountResDTO>;

  getMsgCommentUserCount(): Promise<CountResDTO>;

  getMsgCommentFamilyCount(includeAdmin: boolean): Promise<CountResDTO>;
}

export const MessageService = Symbol('MessageService');

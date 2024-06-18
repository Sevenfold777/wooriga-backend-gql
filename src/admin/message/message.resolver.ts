import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MessageService } from './message.service';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { CountResDTO } from '../dto/count-res.dto';
import { CreateMessageReqDTO } from '../dto/create-message-req.dto';
import { EditMessageReqDTO } from '../dto/edit-message-req.dto';
import { Message } from 'src/message/entities/message.entity';

@Resolver(() => Message)
export class MessageResolver {
  constructor(private readonly messageService: MessageService) {}

  @Query(() => BaseResponseDTO)
  getMsgList(@Args() paginationReqDTO: PaginationReqDTO) {
    return this.messageService.getMsgList(paginationReqDTO);
  }

  @Query(() => BaseResponseDTO)
  getMsgDetail(@Args('id', { type: () => Int }) id: number) {
    return this.messageService.getMsgDetail(id);
  }

  @Mutation(() => BaseResponseDTO)
  editMsg(@Args() editMessageReqDTO: EditMessageReqDTO) {
    return this.messageService.editMsg(editMessageReqDTO);
  }

  @Mutation(() => BaseResponseDTO)
  deleteMsg(@Args('id', { type: () => Int }) id: number) {
    return this.messageService.deleteMsg(id);
  }

  @Mutation(() => BaseResponseDTO)
  sendMsg(@Args('id', { type: () => Int }) id: number) {
    return this.messageService.sendMsg(id);
  }

  @Mutation(() => BaseResponseDTO)
  createMsg(@Args() createMessageReqDTO: CreateMessageReqDTO) {
    return this.messageService.createMsg(createMessageReqDTO);
  }

  @Query(() => CountResDTO)
  getMsgCommentCreateCount(): Promise<CountResDTO> {
    return this.messageService.getMsgCommentCreateCount();
  }

  @Query(() => CountResDTO)
  getMsgKeepCount(): Promise<CountResDTO> {
    return this.messageService.getMsgKeepCount();
  }

  @Query(() => CountResDTO)
  getMsgCommentUserCount(): Promise<CountResDTO> {
    return this.messageService.getMsgCommentUserCount();
  }

  @Query(() => CountResDTO)
  getMsgCommentFamilyCount(
    @Args('includeAdmin', { type: () => Boolean }) includeAdmin: boolean,
  ): Promise<CountResDTO> {
    return this.messageService.getMsgCommentFamilyCount(includeAdmin);
  }
}

import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { InquiryService } from './inquiry.service';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { Inquiry } from './entities/inquiry.entity';
import { CreateInquiryReqDTO } from './dto/create-inquiry-req.dto';
import { EditInquiryReqDTO } from './dto/edit-inquiry-req.dto';

@Resolver()
export class InquiryResolver {
  constructor(private readonly inquiryService: InquiryService) {}

  @Query(() => [Inquiry])
  findInquiries(
    @AuthUser() user: AuthUserId,
    @Args('prev', { type: () => Int }) prev: number,
  ): Promise<Inquiry[]> {
    return null;
  }

  @Query(() => Inquiry)
  findInquiry(
    @AuthUser() user: AuthUserId,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<Inquiry> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  createInquiry(
    @AuthUser() user: AuthUserId,
    @Args('reqDTO') createInquiryReqDTO: CreateInquiryReqDTO,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  editInquiry(
    @AuthUser() user: AuthUserId,
    @Args('reqDTO') editInquiryReqDTO: EditInquiryReqDTO,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  deleteInquiry(
    @AuthUser() user: AuthUserId,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<BaseResponseDTO> {
    return null;
  }
}

import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { CreateInquiryReqDTO } from './dto/create-inquiry-req.dto';
import { EditInquiryReqDTO } from './dto/edit-inquiry-req.dto';
import { InquiriesResDTO } from './dto/inquiries-res.dto';
import { InquiryResDTO } from './dto/inquiry-res.dto';
import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { CreateResDTO } from 'src/common/dto/create-res.dto';

export interface InquiryService {
  findInquiries(
    user: AuthUserId,
    paginationDTO: PaginationReqDTO,
  ): Promise<InquiriesResDTO>;

  findInquiry(user: AuthUserId, id: number): Promise<InquiryResDTO>;

  createInquiry(
    user: AuthUserId,
    reqDTO: CreateInquiryReqDTO,
  ): Promise<CreateResDTO>;

  editInquiry(
    user: AuthUserId,
    reqDTO: EditInquiryReqDTO,
  ): Promise<BaseResponseDTO>;

  deleteInquiry(user: AuthUserId, id: number): Promise<BaseResponseDTO>;
}

export const InquiryService = Symbol('InquiryService');

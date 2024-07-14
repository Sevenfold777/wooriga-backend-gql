import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { CountResDTO } from '../dto/count-res.dto';
import { DauListResDTO } from '../dto/dau-list-res.dto';
import { MauListResDTO } from '../dto/mau-list-res.dto';
import { UserDetailsResDTO } from '../dto/user-details-res.dto';

export interface UserService {
  getUsersCount(): Promise<CountResDTO>;

  getUsersDetails(paginationDTO: PaginationReqDTO): Promise<UserDetailsResDTO>;

  getDau(): Promise<CountResDTO>;

  getMau(): Promise<CountResDTO>;

  getDauHistory(paginationDTO: PaginationReqDTO): Promise<DauListResDTO>;

  getMauHistory(paginationDTO: PaginationReqDTO): Promise<MauListResDTO>;
}

export const UserService = Symbol('UserService');

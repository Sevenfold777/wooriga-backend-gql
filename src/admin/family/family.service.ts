import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { Family } from 'src/family/entities/family.entity';
import { User } from 'src/user/entities/user.entity';
import { CountResDTO } from '../dto/count-res.dto';
import { FamilyDetailsResDTO } from '../dto/family-details-res.dto';

export interface FamilyService {
  getFamilyCount(): Promise<CountResDTO>;

  getFamilyDetails(
    paginationDTO: PaginationReqDTO,
  ): Promise<FamilyDetailsResDTO>;

  getUsers(family: Family): Promise<User[]>;
}

export const FamilyService = Symbol('FamilyService');

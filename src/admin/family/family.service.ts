import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as DataLoader from 'dataloader';
import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { Family } from 'src/family/entities/family.entity';
import { UserStatus } from 'src/user/constants/user-status.enum';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { CountResDTO } from '../dto/count-res.dto';
import { FamilyDetailsResDTO } from '../dto/family-details-res.dto';

@Injectable()
export class FamilyService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Family)
    private readonly familyRepository: Repository<Family>,
  ) {}

  async getFamilyCount(): Promise<CountResDTO> {
    try {
      const familiesCount = await this.familyRepository
        .createQueryBuilder('family')
        .getCount();

      return { result: true, count: familiesCount };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getFamilyDetails({
    take,
    prev,
  }: PaginationReqDTO): Promise<FamilyDetailsResDTO> {
    try {
      const families = await this.familyRepository
        .createQueryBuilder('family')
        .select()
        .orderBy('family.id', 'DESC')
        .offset(take * prev)
        .limit(take)
        .getMany();

      return { result: true, families };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getUsers(family: Family): Promise<User[]> {
    try {
      const users = await this.batchUserLoader.load(family.id);
      console.log(users);

      return users;
    } catch (e) {
      // user 탐색 에러 때문에 전체 프로세스가 실패하지 않도록 빈 배열 반환
      console.error(e);
      return [];
    }
  }

  // repository 분리했다면, Service 바깥으로 빼는 것이 이상적일 듯
  private batchUserLoader = new DataLoader<number, User[]>(
    async (familyIds: readonly number[]) => {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select()
        .where('user.familyId IN (:...familyIds)', { familyIds })
        // .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
        .orderBy('user.id', 'ASC')
        .getMany();

      const userMap: { [key: number]: User[] } = {};

      users.forEach((user) => {
        if (userMap[user.familyId]) {
          userMap[user.familyId].push(user);
        } else {
          userMap[user.familyId] = [user];
        }
      });

      return familyIds.map((familyId) => userMap[familyId] ?? []);
    },
    { cache: false },
  );
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { UserStatus } from 'src/user/constants/user-status.enum';
import { UserAuth } from 'src/user/entities/user-auth.entity';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { CountResDTO } from '../dto/count-res.dto';
import { DauListResDTO } from '../dto/dau-list-res.dto';
import { MauListResDTO } from '../dto/mau-list-res.dto';
import { DAU } from '../entities/dau.entity';
import { MAU } from '../entities/mau.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(DAU) private readonly dauRepository: Repository<DAU>,
    @InjectRepository(MAU) private readonly mauRepository: Repository<MAU>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserAuth)
    private readonly userAuthRepository: Repository<UserAuth>,
  ) {}

  async getUsersCount(): Promise<CountResDTO> {
    try {
      const usersCount = await this.userRepository
        .createQueryBuilder('user')
        .where('user.status = :status', { status: UserStatus.ACTIVE })
        .getCount();

      return { result: true, count: usersCount };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getUsersDetails({ take, prev }: PaginationReqDTO) {
    try {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select()
        .innerJoinAndSelect('user.userAuth', 'auth')
        .orderBy('user.id', 'DESC')
        .offset(take * prev)
        .limit(take)
        .getMany();

      return { result: true, users };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getDau(): Promise<CountResDTO> {
    try {
      const mau = await this.mauRepository
        .createQueryBuilder('mau')
        .select('mau.count')
        .orderBy('date', 'DESC')
        .getOneOrFail();

      return { result: true, count: mau.count };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getMau(): Promise<CountResDTO> {
    try {
      const dau = await this.dauRepository
        .createQueryBuilder('dau')
        .select('dau.count')
        .orderBy('date', 'DESC')
        .getOneOrFail();

      return { result: true, count: dau.count };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getDauHistory({
    take,
    prev,
  }: PaginationReqDTO): Promise<DauListResDTO> {
    try {
      const dauList = await this.dauRepository
        .createQueryBuilder('dau')
        .select()
        .orderBy('date', 'DESC')
        .offset(take * prev)
        .limit(take)
        .getMany();

      return { result: true, dauList };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getMauHistory({
    take,
    prev,
  }: PaginationReqDTO): Promise<MauListResDTO> {
    try {
      const mauList = await this.mauRepository
        .createQueryBuilder('mau')
        .select()
        .orderBy('date', 'DESC')
        .offset(take * prev)
        .limit(take)
        .getMany();

      return { result: true, mauList };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }
}

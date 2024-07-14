import { OnModuleDestroy } from '@nestjs/common';
import { RedisFamilyMember } from './entities/redis-family-member.entity';
import { RedisDeleteFamilyReqDTO } from './dto/redis-delete-family-req.dto';
import { RedisDeleteUserReqDTO } from './dto/redis-delete-user-req.dto';

export interface RedisFamilyMemberService extends OnModuleDestroy {
  setItem(item: RedisFamilyMember): Promise<void>;

  deleteFamilyItem(
    redisDeleteFamilyReqDTO: RedisDeleteFamilyReqDTO,
  ): Promise<void>;

  deleteUserItem(redisDeleteUserReqDTO: RedisDeleteUserReqDTO): Promise<void>;
}

export const RedisFamilyMemberService = Symbol('RedisFamilyMemberService');

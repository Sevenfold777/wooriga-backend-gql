import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { CustomValidate } from 'src/common/utils/custom-validate.decorator';
import { RedisFamilyMember } from './entities/redis-family-member.entity';
import { RedisDeleteFamilyReqDTO } from './dto/redis-delete-family-req.dto';
import { RedisDeleteUserReqDTO } from './dto/redis-delete-user-req.dto';
import { RedisFamilyMemberService } from './redis-family-member.service';

@Injectable()
export class RedisFamilyMemberServiceImpl implements RedisFamilyMemberService {
  private redis: Redis;

  private readonly FAMILY_ID_PREFIX = 'family:';
  private readonly USER_ID_PREFIX = 'user:';

  private logger = new Logger('Redis');

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  @CustomValidate(RedisFamilyMember)
  async setItem(item: RedisFamilyMember): Promise<void> {
    try {
      const { familyId, userId, userName, fcmToken, mktPushAgreed } = item;

      const familyKey = this.formatFamilyIdKey(familyId);
      const userKey = this.formatUserIdKey(userId);
      const hashValue = this.formatUserInfo(userName, fcmToken, mktPushAgreed);

      await this.redis.hset(familyKey, { [userKey]: hashValue });
    } catch (e) {
      this.logger.error('Failed to set item to redis family member table.', e);
    }
  }

  @CustomValidate(RedisDeleteFamilyReqDTO)
  async deleteFamilyItem({ familyId }: RedisDeleteFamilyReqDTO): Promise<void> {
    try {
      const familyKey = this.formatFamilyIdKey(familyId);

      // 지금처럼 삭제하는 item의 개수가 하나거나 매우 적다면, del과 unlink는 사실상 동일한 성능
      // 만약 한 번에 삭제할 item의 개수가 많다면 unlink 사용하여
      // O(1) 시간에 key들을 keyspace에서 삭제하고
      // 새로운 스레드에서 실제 value들을 O(n) 시간동안 삭제하여 non-blocking 하게 동작하도록 함
      // (item이 여러 개여도 그 수가 적다면 성능 상 문제가 마약하기에 del과 동일하게 동작할 수 있음)
      await this.redis.unlink(familyKey);
    } catch (e) {
      this.logger.error(
        'Failed to unlink family from redis family member table.',
        e,
      );
    }
  }

  @CustomValidate(RedisDeleteUserReqDTO)
  async deleteUserItem({
    familyId,
    userId,
  }: RedisDeleteUserReqDTO): Promise<void> {
    try {
      const familyKey = this.formatFamilyIdKey(familyId);
      const userKey = this.formatUserIdKey(userId);

      // 지금처럼 한 명의 사용자를 삭제하는 경우,
      // family 찾는 데에 O(1), user 찾는 데에 O(1)이 걸리므로 총 O(1)
      // 만약 여러 user를 동시에 삭제해야 하는 경우가 발생하여도,
      // 서비스의 특성상 하나의 family에 한 자리 수의 매우 적은 user가 할당되므로 O(1)이라고 볼 수 있음
      await this.redis.hdel(familyKey, userKey);
    } catch (e) {
      this.logger.error(
        'Failed to unlink user from redis family member table.',
        e,
      );
    }
  }

  // private utils for this class
  private formatFamilyIdKey(familyId: number): string {
    return this.FAMILY_ID_PREFIX + String(familyId);
  }

  private formatUserIdKey(userId: number): string {
    return this.USER_ID_PREFIX + String(userId);
  }

  private formatUserInfo(
    userName: string,
    fcmToken: string,
    mktPushAgreed: boolean,
  ): string {
    return JSON.stringify({ userName, fcmToken, mktPushAgreed });
  }
}

import { RedisFamilyMemberService } from './../redis-family-member/redis-family-member.service';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CreateNotificationReqDTO } from './dto/create-notification-req.dto';
import { CustomValidate } from 'src/common/utils/custom-validate.decorator';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { NotificationResDTO } from './dto/notification-res.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { User } from 'src/user/entities/user.entity';
import { RedisFamilyMember } from 'src/redis-family-member/entities/redis-family-member.entity';
import { RedisDeleteUserReqDTO } from 'src/redis-family-member/dto/redis-delete-user-req.dto';
import {
  FAMILY_JOIN_EVENT,
  SQS_NOTIFICATION_STORE_RECEIVE_EVENT,
  USER_FCM_UPDATED_EVENT,
  USER_SIGN_OUT_EVENT,
  USER_UPDATE_EVENT,
  USER_WITHDRAW_EVENT,
} from 'src/common/constants/events';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly redisFamilyMemberService: RedisFamilyMemberService,
  ) {}

  @OnEvent(SQS_NOTIFICATION_STORE_RECEIVE_EVENT)
  @CustomValidate(CreateNotificationReqDTO)
  private async handleNotificationStore(
    notifList: CreateNotificationReqDTO[],
  ): Promise<void> {
    try {
      const insertValues: QueryDeepPartialEntity<Notification>[] = [];

      for (const notif of notifList) {
        const { title, body, screen, param, receiverId } = notif;

        insertValues.push({
          title,
          body,
          receiver: { id: receiverId },
          ...(screen && {
            screen,
            ...(param && { param: JSON.stringify(param) }),
          }),
        });
      }

      await this.notificationRepository
        .createQueryBuilder('notif')
        .insert()
        .into(Notification)
        .values(insertValues)
        .updateEntity(false)
        .execute();
    } catch (e) {
      console.error('ERROR ', e.message);
    }
  }

  /*
   * @OnEvent('user.signIn') => 사용하지 않음
   * 앱에서 signIn 성공 이후, 필요에 따라 fcmToken 업데이트 요청을 진행
   * 따라서 fcmToken 업데이트 시 이벤트 트리거 (signIn은 fcmToken Update의 선행 조건)
   */
  @OnEvent(USER_UPDATE_EVENT)
  @OnEvent(USER_FCM_UPDATED_EVENT)
  private async handleSetUserItem(user: User): Promise<void> {
    try {
      const redisFamilyMember = new RedisFamilyMember();
      redisFamilyMember.familyId = user.familyId;
      redisFamilyMember.userId = user.id;
      redisFamilyMember.userName = user.userName;
      redisFamilyMember.mktPushAgreed = user.mktPushAgreed;
      redisFamilyMember.fcmToken = user.fcmToken;

      return this.redisFamilyMemberService.setItem(redisFamilyMember);
    } catch (e) {
      console.error(e.message);
    }
  }

  @OnEvent(FAMILY_JOIN_EVENT)
  @CustomValidate(RedisDeleteUserReqDTO)
  private async handleFamilyJoined({
    familyId,
    userId,
  }: RedisDeleteUserReqDTO): Promise<void> {
    try {
      const user = await this.userRepository
        .createQueryBuilder('user')
        .select()
        .where('id = :userId', { userId })
        .getOneOrFail();

      const redisFamilyMember = new RedisFamilyMember();
      redisFamilyMember.familyId = user.familyId;
      redisFamilyMember.userId = user.id;
      redisFamilyMember.userName = user.userName;
      redisFamilyMember.mktPushAgreed = user.mktPushAgreed;
      redisFamilyMember.fcmToken = user.fcmToken;

      // 기존 hash map field 삭제, set new item
      await Promise.all([
        this.redisFamilyMemberService.deleteUserItem({ familyId, userId }),
        this.redisFamilyMemberService.setItem(redisFamilyMember),
      ]);
    } catch (e) {
      console.error(e.message);
    }
  }

  @OnEvent(USER_SIGN_OUT_EVENT)
  @OnEvent(USER_WITHDRAW_EVENT)
  @CustomValidate(RedisDeleteUserReqDTO)
  private async handleDeleteUserItem({
    familyId,
    userId,
  }: RedisDeleteUserReqDTO): Promise<void> {
    try {
      await this.redisFamilyMemberService.deleteUserItem({ familyId, userId });
    } catch (e) {
      console.error(e);
    }
  }

  async findNotifications(
    { userId }: AuthUserId,
    { take, prev }: PaginationReqDTO,
  ): Promise<NotificationResDTO> {
    try {
      const notifs = await this.notificationRepository
        .createQueryBuilder('notif')
        .select()
        .where('notif.receiver.id = :userId', { userId })
        .orderBy('notif.createdAt', 'DESC')
        .addOrderBy('notif.id', 'DESC')
        .offset(take * prev)
        .limit(take)
        .getMany();

      return { result: true, notifications: notifs };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async deleteNotification(
    { userId }: AuthUserId,
    id: number,
  ): Promise<BaseResponseDTO> {
    try {
      const deleteResult = await this.notificationRepository
        .createQueryBuilder('notif')
        .delete()
        .from(Notification)
        .where('id = :id', { id })
        .andWhere('receiver.id = :userId', { userId })
        .execute();

      if (deleteResult.affected !== 1) {
        throw new Error('Cannot delete the notification.');
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }
}

import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { NotificationResDTO } from './dto/notification-res.dto';

export interface NotificationService {
  findNotifications(
    { userId }: AuthUserId,
    { take, prev }: PaginationReqDTO,
  ): Promise<NotificationResDTO>;

  deleteNotification(
    { userId }: AuthUserId,
    id: number,
  ): Promise<BaseResponseDTO>;
}

export const NotificationService = Symbol('NotificationService');

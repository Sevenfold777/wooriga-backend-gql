import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { NotificationService } from './notification.service';
import { Notification } from './entities/notification.entity';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';

@Resolver(() => Notification)
export class NotificationResolver {
  constructor(private readonly notificationService: NotificationService) {}

  @Query(() => [Notification], {
    description: '나의 알림 목록 찾기 (페이지네이션)',
  })
  findNotifications(
    @AuthUser() user: AuthUserId,
    @Args('prev', { type: () => Int }) prev: number,
  ): Promise<Notification[]> {
    return null;
  }

  @Mutation(() => BaseResponseDTO, { description: '나의 알림 내역 1개 삭제' })
  deleteNotification(
    @AuthUser() user: AuthUserId,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<BaseResponseDTO> {
    return null;
  }
}

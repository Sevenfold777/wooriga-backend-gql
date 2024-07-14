import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationResolver } from './notification.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { RedisFamilyMemberModule } from 'src/redis-family-member/redis-family-member.module';
import { User } from 'src/user/entities/user.entity';
import { NotificationServiceImpl } from './notification.service.impl';

@Module({
  imports: [
    RedisFamilyMemberModule,
    TypeOrmModule.forFeature([Notification, User]),
  ],
  providers: [
    NotificationResolver,
    { provide: NotificationService, useClass: NotificationServiceImpl },
  ],
})
export class NotificationModule {}

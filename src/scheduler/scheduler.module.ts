import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Message } from 'src/message/entities/message.entity';
import { MessageFamily } from 'src/message/entities/message-family.entity';
import { UserAuth } from 'src/user/entities/user-auth.entity';
import { Letter } from 'src/letter/entities/letter.entity';
import { SqsNotificationModule } from 'src/sqs-notification/sqs-notification.module';
import { Family } from 'src/family/entities/family.entity';
import { DAU } from 'src/admin/entities/dau.entity';
import { MAU } from 'src/admin/entities/mau.entity';

@Module({
  imports: [
    SqsNotificationModule,
    TypeOrmModule.forFeature([
      User,
      UserAuth,
      Family,
      Message,
      MessageFamily,
      Letter,
      DAU,
      MAU,
    ]),
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}

/**
 * 트래픽 대응 및 책임 분리를 위해 추후 스케쥴러는 쉽게 분리할 수 있도록 구현
 * 다른 모듈 서비스 import/inject 받지 않고, repository 직접 사용
 */

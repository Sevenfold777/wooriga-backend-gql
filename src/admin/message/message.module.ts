import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageResolver } from './message.resolver';
import { SqsNotificationModule } from 'src/sqs-notification/sqs-notification.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Family } from 'src/family/entities/family.entity';
import { MessageComment } from 'src/message/entities/message-comment.entity';
import { MessageFamily } from 'src/message/entities/message-family.entity';
import { MessageKeep } from 'src/message/entities/message-keep.entity';
import { Message } from 'src/message/entities/message.entity';
import { MessageServiceImpl } from './message.service.impl';

@Module({
  imports: [
    SqsNotificationModule,
    TypeOrmModule.forFeature([
      Message,
      MessageFamily,
      MessageComment,
      MessageKeep,
      Family,
    ]),
  ],
  providers: [
    MessageResolver,
    { provide: MessageService, useClass: MessageServiceImpl },
  ],
})
export class MessageModule {}

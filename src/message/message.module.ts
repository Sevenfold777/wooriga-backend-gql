import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageResolver } from './message.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageFamily } from './entities/message-family.entity';
import { MessageComment } from './entities/message-comment.entity';
import { MessageKeep } from './entities/message-keep.entity';
import { SqsNotificationModule } from 'src/sqs-notification/sqs-notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageFamily, MessageComment, MessageKeep]),
    SqsNotificationModule,
  ],
  providers: [MessageResolver, MessageService],
})
export class MessageModule {}

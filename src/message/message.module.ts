import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageResolver } from './message.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { MessageFamily } from './entities/message-family.entity';
import { MessageComment } from './entities/message-comment.entity';
import { MessageKeep } from './entities/message-keep.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Message,
      MessageFamily,
      MessageComment,
      MessageKeep,
    ]),
  ],
  providers: [MessageResolver, MessageService],
})
export class MessageModule {}

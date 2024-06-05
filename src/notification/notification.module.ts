import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationResolver } from './notification.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { DynamoModule } from 'src/dynamo/dynamo.module';

@Module({
  imports: [DynamoModule, TypeOrmModule.forFeature([Notification])],
  providers: [NotificationResolver, NotificationService],
})
export class NotificationModule {}

import { Module } from '@nestjs/common';
import { LetterService } from './letter.service';
import { LetterResolver } from './letter.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Letter } from './entities/letter.entity';
import { LetterGuide } from './entities/letter-guide.entity';
import { User } from 'src/user/entities/user.entity';
import { SqsNotificationModule } from 'src/sqs-notification/sqs-notification.module';
import { LetterServiceImpl } from './letter.service.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([Letter, LetterGuide, User]),
    SqsNotificationModule,
  ],
  providers: [
    LetterResolver,
    { provide: LetterService, useClass: LetterServiceImpl },
  ],
})
export class LetterModule {}

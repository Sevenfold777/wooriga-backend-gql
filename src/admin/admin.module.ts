import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DAU } from './user/entities/dau.entity';
import { MAU } from './user/entities/mau.entity';
import { User } from 'src/user/entities/user.entity';
import { Photo } from 'src/photo/entities/photo.entity';
import { Family } from 'src/family/entities/family.entity';
import { MessageFamily } from 'src/message/entities/message-family.entity';
import { Message } from 'src/message/entities/message.entity';
import { MessageComment } from 'src/message/entities/message-comment.entity';
import { MessageKeep } from 'src/message/entities/message-keep.entity';
import { Letter } from 'src/letter/entities/letter.entity';
import { PhotoComment } from 'src/photo/entities/photo-comment.entity';
import { DailyEmotion } from 'src/daily-emotion/entities/daily-emotion.entity';
import { FamilyPedia } from 'src/family-pedia/entities/family-pedia.entity';
import { FamilyPediaQuestion } from 'src/family-pedia/entities/family-pedia-question';
import { UserAuth } from 'src/user/entities/user-auth.entity';
import { SqsNotificationModule } from 'src/sqs-notification/sqs-notification.module';
import { UserModule } from './user/user.module';
import { FamilyModule } from './family/family.module';
import { PhotoModule } from './photo/photo.module';
import { LetterModule } from './letter/letter.module';
import { FamilyPediaModule } from './family-pedia/family-pedia.module';
import { DailyEmotionModule } from './daily-emotion/daily-emotion.module';
import { MessageModule } from './message/message.module';

@Module({
  imports: [
    SqsNotificationModule,
    TypeOrmModule.forFeature([
      DAU,
      MAU,
      User,
      UserAuth,
      Family,
      Message,
      MessageFamily,
      MessageComment,
      MessageKeep,
      Photo,
      PhotoComment,
      Letter,
      DailyEmotion,
      FamilyPedia,
      FamilyPediaQuestion,
    ]),
    UserModule,
    FamilyModule,
    PhotoModule,
    LetterModule,
    FamilyPediaModule,
    DailyEmotionModule,
    MessageModule,
  ],
})
export class AdminModule {}

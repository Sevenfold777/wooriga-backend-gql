import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { SampleModule } from './sample/sample.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { User } from './user/entities/user.entity';
import { UserAuth } from './user/entities/user-auth.entity';
import { UploadModule } from './upload/upload.module';
import { AdminModule } from './admin/admin.module';
import { BannerModule } from './banner/banner.module';
import { EmotionModule } from './emotion/emotion.module';
import { FamilyModule } from './family/family.module';
import { FamilyPediaModule } from './family-pedia/family-pedia.module';
import { LetterModule } from './letter/letter.module';
import { MessageModule } from './message/message.module';
import { NotificationModule } from './notification/notification.module';
import { PhotoModule } from './photo/photo.module';
import { InquiryModule } from './inquiry/inquiry.module';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: '.env.dev.local' }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User, UserAuth],
      synchronize: false,
      logging: true,
      timezone: '+09:00',
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      path: '/api/v2/graphql',
      playground: true,
    }),
    ScheduleModule.forRoot(),
    SampleModule,
    UserModule,
    AuthModule,
    UploadModule,
    AdminModule,
    BannerModule,
    EmotionModule,
    FamilyModule,
    FamilyPediaModule,
    LetterModule,
    MessageModule,
    NotificationModule,
    PhotoModule,
    InquiryModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

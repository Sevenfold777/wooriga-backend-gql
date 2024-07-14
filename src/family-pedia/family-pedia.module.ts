import { Module } from '@nestjs/common';
import { FamilyPediaService } from './family-pedia.service';
import { FamilyPediaResolver } from './family-pedia.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamilyPedia } from './entities/family-pedia.entity';
import { FamilyPediaQuestion } from './entities/family-pedia-question';
import { User } from 'src/user/entities/user.entity';
import { SqsNotificationModule } from 'src/sqs-notification/sqs-notification.module';
import { S3Module } from 'src/s3/s3.module';
import { FamilyPediaProfilePhoto } from './entities/family-pedia-profile-photo.entity';
import { FamilyPediaServiceImpl } from './family-pedia.service.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FamilyPedia,
      FamilyPediaQuestion,
      User,
      FamilyPediaProfilePhoto,
    ]),
    SqsNotificationModule,
    S3Module,
  ],
  providers: [
    FamilyPediaResolver,
    { provide: FamilyPediaService, useClass: FamilyPediaServiceImpl },
  ],
  exports: [FamilyPediaService],
})
export class FamilyPediaModule {}

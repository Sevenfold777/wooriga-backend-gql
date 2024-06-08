import { Module } from '@nestjs/common';
import { FamilyPediaService } from './family-pedia.service';
import { FamilyPediaResolver } from './family-pedia.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamilyPedia } from './entities/family-pedia.entity';
import { FamilyPediaQuestion } from './entities/family-pedia-question';
import { User } from 'src/user/entities/user.entity';
import { SqsNotificationModule } from 'src/sqs-notification/sqs-notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FamilyPedia, FamilyPediaQuestion, User]),
    SqsNotificationModule,
  ],
  providers: [FamilyPediaResolver, FamilyPediaService],
  exports: [FamilyPediaService],
})
export class FamilyPediaModule {}

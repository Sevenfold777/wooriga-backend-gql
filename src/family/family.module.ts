import { Module } from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyResolver } from './family.resolver';
import { AuthModule } from 'src/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Family } from './entities/family.entity';
import { MessageFamily } from 'src/message/entities/message-family.entity';
import { User } from 'src/user/entities/user.entity';
import { UserAuth } from 'src/user/entities/user-auth.entity';
import { FamilyServiceImpl } from './family.service.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([Family, MessageFamily, User, UserAuth]),
    AuthModule,
  ],
  providers: [
    FamilyResolver,
    { provide: FamilyService, useClass: FamilyServiceImpl },
  ],
  exports: [FamilyService],
})
export class FamilyModule {}

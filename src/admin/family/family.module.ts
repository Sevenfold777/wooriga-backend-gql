import { Module } from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyResolver } from './family.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Family } from 'src/family/entities/family.entity';
import { FamilyServiceImpl } from './family.service.impl';

@Module({
  imports: [TypeOrmModule.forFeature([User, Family])],
  providers: [
    FamilyResolver,
    { provide: FamilyService, useClass: FamilyServiceImpl },
  ],
})
export class FamilyModule {}

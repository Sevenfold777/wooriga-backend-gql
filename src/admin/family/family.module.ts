import { Module } from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyResolver } from './family.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Family } from 'src/family/entities/family.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Family])],
  providers: [FamilyResolver, FamilyService],
})
export class FamilyModule {}

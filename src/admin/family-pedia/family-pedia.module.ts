import { Module } from '@nestjs/common';
import { FamilyPediaService } from './family-pedia.service';
import { FamilyPediaResolver } from './family-pedia.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamilyPedia } from 'src/family-pedia/entities/family-pedia.entity';
import { FamilyPediaQuestion } from 'src/family-pedia/entities/family-pedia-question';

@Module({
  imports: [TypeOrmModule.forFeature([FamilyPedia, FamilyPediaQuestion])],
  providers: [FamilyPediaResolver, FamilyPediaService],
})
export class FamilyPediaModule {}

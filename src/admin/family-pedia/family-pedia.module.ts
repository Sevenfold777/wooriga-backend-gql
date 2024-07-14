import { Module } from '@nestjs/common';
import { FamilyPediaService } from './family-pedia.service';
import { FamilyPediaResolver } from './family-pedia.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamilyPedia } from 'src/family-pedia/entities/family-pedia.entity';
import { FamilyPediaQuestion } from 'src/family-pedia/entities/family-pedia-question';
import { FamilyPediaServiceImpl } from './family-pedia.service.impl';

@Module({
  imports: [TypeOrmModule.forFeature([FamilyPedia, FamilyPediaQuestion])],
  providers: [
    FamilyPediaResolver,
    { provide: FamilyPediaService, useClass: FamilyPediaServiceImpl },
  ],
})
export class FamilyPediaModule {}

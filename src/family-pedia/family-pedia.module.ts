import { Module } from '@nestjs/common';
import { FamilyPediaService } from './family-pedia.service';
import { FamilyPediaResolver } from './family-pedia.resolver';

@Module({
  imports: [],
  providers: [FamilyPediaResolver, FamilyPediaService],
})
export class FamilyPediaModule {}

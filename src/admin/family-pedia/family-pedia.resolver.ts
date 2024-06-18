import { Query, Resolver } from '@nestjs/graphql';
import { FamilyPediaService } from './family-pedia.service';
import { CountResDTO } from '../dto/count-res.dto';
import { FamilyPedia } from 'src/family-pedia/entities/family-pedia.entity';

@Resolver(() => FamilyPedia)
export class FamilyPediaResolver {
  constructor(private readonly familyPediaService: FamilyPediaService) {}

  @Query(() => CountResDTO)
  getPediaEditCount(): Promise<CountResDTO> {
    return this.familyPediaService.getPediaEditCount();
  }
}

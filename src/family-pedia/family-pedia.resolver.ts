import { Resolver } from '@nestjs/graphql';
import { FamilyPediaService } from './family-pedia.service';

@Resolver()
export class FamilyPediaResolver {
  constructor(private readonly familyPediaService: FamilyPediaService) {}
}

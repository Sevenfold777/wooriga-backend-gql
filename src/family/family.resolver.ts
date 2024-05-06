import { Resolver } from '@nestjs/graphql';
import { FamilyService } from './family.service';

@Resolver()
export class FamilyResolver {
  constructor(private readonly familyService: FamilyService) {}
}

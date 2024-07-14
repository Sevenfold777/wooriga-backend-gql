import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FamilyService } from './family.service';
import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { CountResDTO } from '../dto/count-res.dto';
import { FamilyDetailsResDTO } from '../dto/family-details-res.dto';
import { Family } from 'src/family/entities/family.entity';
import { User } from 'src/user/entities/user.entity';
import { Inject } from '@nestjs/common';

@Resolver(() => Family)
export class FamilyResolver {
  constructor(
    @Inject(FamilyService) private readonly familyService: FamilyService,
  ) {}

  @Query(() => CountResDTO)
  getFamilyCount(): Promise<CountResDTO> {
    return this.familyService.getFamilyCount();
  }

  @Query(() => FamilyDetailsResDTO)
  getFamilyDetails(
    @Args() paginationReqDTO: PaginationReqDTO,
  ): Promise<FamilyDetailsResDTO> {
    return this.familyService.getFamilyDetails(paginationReqDTO);
  }

  @ResolveField(() => [User], { name: 'members', nullable: true })
  getUsers(@Parent() family: Family): Promise<User[]> {
    return this.familyService.getUsers(family);
  }
}

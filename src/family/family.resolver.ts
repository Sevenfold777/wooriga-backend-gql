import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FamilyService } from './family.service';
import { Family } from './entities/family.entity';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { InviteFamilyResDTO } from './dto/invite-family-res.dto';
import { FamilyResDTO } from './dto/family-res.dto';
import { JoinFamilyResDTO } from './dto/join-family-res.dto';
import { Inject } from '@nestjs/common';

@Resolver(() => Family)
export class FamilyResolver {
  constructor(
    @Inject(FamilyService) private readonly familyService: FamilyService,
  ) {}

  @Query(() => FamilyResDTO)
  findMyFamily(
    @AuthUser() user: AuthUserId,
    @Args('exceptMe', { nullable: true, defaultValue: false })
    exceptMe: boolean,
  ): Promise<FamilyResDTO> {
    return this.familyService.findMyFamily(user, exceptMe);
  }

  @Mutation(() => JoinFamilyResDTO)
  joinFamily(
    @AuthUser() user: AuthUserId,
    @Args('familyToken') familyToken: string,
  ): Promise<JoinFamilyResDTO> {
    return this.familyService.joinFamily(user, familyToken);
  }

  @Mutation(() => InviteFamilyResDTO)
  inviteFamily(@AuthUser() user: AuthUserId): Promise<InviteFamilyResDTO> {
    return this.familyService.inviteFamily(user);
  }
}

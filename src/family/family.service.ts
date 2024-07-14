import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { InviteFamilyResDTO } from './dto/invite-family-res.dto';
import { FamilyResDTO } from './dto/family-res.dto';
import { CreateResDTO } from 'src/common/dto/create-res.dto';
import { JoinFamilyResDTO } from './dto/join-family-res.dto';

export interface FamilyService {
  createFamily(): Promise<CreateResDTO>;

  findMyFamily(user: AuthUserId, exceptMe: boolean): Promise<FamilyResDTO>;

  joinFamily(user: AuthUserId, familyToken: string): Promise<JoinFamilyResDTO>;

  inviteFamily(user: AuthUserId): Promise<InviteFamilyResDTO>;
}

export const FamilyService = Symbol('FamilyService');

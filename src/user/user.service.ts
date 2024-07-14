import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { UserResDTO } from './dto/user-res.dto';
import { SignInResDTO } from './dto/sign-in-res.dto';
import { SignUpReqDTO } from './dto/sign-up-req.dto';
import { EditUserReqDTO } from './dto/edit-user-req.dto';
import { SignInReqDTO } from './dto/sign-in-req.dto';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { RefreshTokenReqDTO } from './dto/refresh-token-req.dto';
import { SelectQueryBuilder } from 'typeorm';
import { UserAuth } from './entities/user-auth.entity';

export interface UserService {
  findMyProfile({ userId }: AuthUserId): Promise<UserResDTO>;

  signUp(signUpReqDTO: SignUpReqDTO): Promise<SignInResDTO>;

  editUser(
    { userId }: AuthUserId,
    editUserReqDTO: EditUserReqDTO,
  ): Promise<UserResDTO>;

  signIn({ provider, token, nonce }: SignInReqDTO): Promise<SignInResDTO>;

  signOut({ userId, familyId }: AuthUserId): Promise<BaseResponseDTO>;

  refreshToken({ refreshToken }: RefreshTokenReqDTO): Promise<SignInResDTO>;

  withdraw({ familyId, userId }: AuthUserId): Promise<BaseResponseDTO>;

  issueTokenAndUpdate(
    userId: number,
    familyId: number,
    userAuthQueryBuilder: SelectQueryBuilder<UserAuth>,
  ): Promise<{ accessToken: string; refreshToken: string }>;

  fcmTokenUpdate(
    { userId }: AuthUserId,
    fcmTokenToUpdate: string,
  ): Promise<BaseResponseDTO>;
}

export const UserService = Symbol('UserService');

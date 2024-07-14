import { AuthUserId } from './constants/auth-user-id.type';
import { EncryptReqType } from './constants/encrypt-req.type';
import { SocialLoginResType } from './constants/social-login-res.type';
import { JwtSignReqType } from './constants/jwt-sign-req.type';

export interface AuthService {
  /* JWT Methods */
  sign(req: JwtSignReqType): string;

  verify(token: string): AuthUserId;

  /* Encrypt */
  encrypt(req: EncryptReqType): Promise<string>;

  decrypt(req: EncryptReqType): Promise<string>;

  /* Social Login */
  appleLogin(id_token: string, nonce: string): Promise<SocialLoginResType>;

  kakaoLogin(accessToken: string): Promise<SocialLoginResType>;

  naverLogin(accessToken: string): Promise<SocialLoginResType>;
}

export const AuthService = Symbol('AuthService');

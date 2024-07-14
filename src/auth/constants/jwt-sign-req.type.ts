import { TOKEN_TYPE } from './token-type.enum';

export type JwtSignReqType = {
  userId: number;
  familyId: number;
  tokenType: TOKEN_TYPE;
};

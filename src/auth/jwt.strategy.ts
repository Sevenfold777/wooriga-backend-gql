import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUserId } from './constants/auth-user-id.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // @InjectRepository(User) private userRepository: Repository<User>,
  // @InjectRepository(Admin) private adminRepository: Repository<Admin>,
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET_KEY,
      ignoreExpiration: false,
      passReqToCallback: true, // validate에 req 넘기기 위하여
    });
  }

  async validate(req: Request, { userId, familyId }: AuthUserId) {
    const user = { userId, familyId };

    // admin api일 경우 DB 체크
    if (req['isAdmin']) {
      const adminList: number[] = JSON.parse(process.env.ADMIN_USER_LIST);

      if (!adminList.includes(userId)) {
        throw new UnauthorizedException();
      }
    }

    return user; // payload의 모든 protperty를 포함하는 객체를 리턴하면 됨
  }
}

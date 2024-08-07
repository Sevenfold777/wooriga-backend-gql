import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { User } from './entities/user.entity';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { UserStatus } from './constants/user-status.enum';
import { DataSource, Repository } from 'typeorm';
import { UserAuth } from './entities/user-auth.entity';
import { UserResDTO } from './dto/user-res.dto';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { EditUserReqDTO } from './dto/edit-user-req.dto';
import { RefreshTokenReqDTO } from './dto/refresh-token-req.dto';
import { SignInReqDTO } from './dto/sign-in-req.dto';
import { SignInResDTO } from './dto/sign-in-res.dto';
import { SignUpReqDTO } from './dto/sign-up-req.dto';
import { AuthService } from 'src/auth/auth.service';
import { TOKEN_TYPE } from 'src/auth/constants/token-type.enum';
import { AuthProvider } from './constants/auth-provider.enum';
import { FamilyService } from 'src/family/family.service';
import { SignInRejectType } from './constants/sign-in-reject-type.enum';
import { FamilyPediaService } from 'src/family-pedia/family-pedia.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  USER_FCM_UPDATED_EVENT,
  USER_SIGN_OUT_EVENT,
  USER_UPDATE_EVENT,
  USER_WITHDRAW_EVENT,
} from 'src/common/constants/events';
import { CommentStatus } from 'src/common/constants/comment-status.enum';
import { Photo } from 'src/photo/entities/photo.entity';
import { PhotoComment } from 'src/photo/entities/photo-comment.entity';
import { MessageComment } from 'src/message/entities/message-comment.entity';
import { UserService } from './user.service';

@Injectable()
export class UserServiceImpl implements UserService {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(FamilyService) private readonly familyService: FamilyService,
    @Inject(FamilyPediaService)
    private readonly pediaService: FamilyPediaService,
    @InjectDataSource() private dataSource: DataSource,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(UserAuth)
    private userAuthRepository: Repository<UserAuth>,
    private eventEmitter: EventEmitter2,
  ) {}

  async findMyProfile({ userId }: AuthUserId): Promise<UserResDTO> {
    try {
      const user = await this.userRepository
        .createQueryBuilder()
        .select()
        .where('id = :userId', { userId })
        .andWhere('status = :status', { status: UserStatus.ACTIVE })
        .getOneOrFail();

      return { result: true, user };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  /**
   * v2. Sign In 역할까지 한 번에 (issue jwt)
   */
  async signUp(signUpReqDTO: SignUpReqDTO): Promise<SignInResDTO> {
    const queryRunner = this.dataSource.createQueryRunner();

    queryRunner.connect();
    queryRunner.startTransaction();

    try {
      const {
        email,
        birthday,
        position,
        familyToken,
        userName,
        provider,
        mktPushAgreed,
        token,
        nonce,
        isBirthLunar,
      } = signUpReqDTO;

      let familyIdToJoin: number;
      const birthdayStr = `${birthday.slice(0, 4)}-${birthday.slice(4, 6)}-${birthday.slice(6)}`;

      // handle family
      if (familyToken) {
        // verify familyToken (to join family)
        const tokenVerified = await this.authService.decrypt({
          target: familyToken,
        });
        familyIdToJoin = parseInt(tokenVerified);
      } else {
        // create new family if needed
        const { result, id } = await this.familyService.createFamily();

        if (result) familyIdToJoin = id;
        else throw new Error('Cannot create new Family (from FamilyService).');
      }

      // token verify
      let authInfo: { email: string; id?: string };
      switch (provider) {
        case AuthProvider.KAKAO:
          authInfo = await this.authService.kakaoLogin(token);
          break;

        case AuthProvider.NAVER:
          authInfo = await this.authService.naverLogin(token);
          break;

        case AuthProvider.APPLE:
          authInfo = await this.authService.appleLogin(token, nonce);
          break;

        default:
          break;
      }

      // create user
      const userResult = await queryRunner.manager
        .createQueryBuilder(User, 'user')
        .insert()
        .values({
          email,
          userName,
          provider,
          position,
          mktPushAgreed,
          isBirthLunar,
          birthday: new Date(birthdayStr),
          family: { id: familyIdToJoin },
        })
        .updateEntity(false)
        .execute();

      const userId = userResult.raw?.insertId;

      // issue JWT
      const { accessToken, refreshToken } = await this.issueTokenAndUpdate(
        userId,
        familyIdToJoin,
        queryRunner.manager.createQueryBuilder(UserAuth, 'userAuth'),
      );

      // create userAuth
      await queryRunner.manager
        .createQueryBuilder(UserAuth, 'userAuth')
        .insert()
        .values({
          user: { id: userId },
          refreshToken,
          ...(authInfo?.id && { providerId: authInfo.id }),
        })
        .updateEntity(false)
        .execute();

      // create family pedia service // 에러 나면 여기서 Handle (return void)
      await this.pediaService.createFamilyPedia(userId, queryRunner);

      await queryRunner.commitTransaction();

      return { result: true, accessToken, refreshToken };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      return { result: false, error: e.message };
    } finally {
      queryRunner.release();
    }
  }

  async editUser(
    { userId }: AuthUserId,
    editUserReqDTO: EditUserReqDTO,
  ): Promise<UserResDTO> {
    const queryRunner = this.dataSource.createQueryRunner();

    queryRunner.connect();
    queryRunner.startTransaction();

    try {
      const { birthday } = editUserReqDTO;

      let birthdayStr: string;

      if (birthday) {
        birthdayStr = `${birthday.slice(0, 4)}-${birthday.slice(4, 6)}-${birthday.slice(6)}`;
      }

      const updateResult = await queryRunner.manager
        .createQueryBuilder(User, 'user')
        .update()
        .where('id = :userId', { userId })
        .set({
          ...editUserReqDTO,
          ...(birthday && { birthday: new Date(birthdayStr) }),
        })
        .updateEntity(true)
        .execute();

      if (updateResult?.affected !== 1) {
        throw new Error('Cannot update the user with request body.');
      }

      const userUpdated = await queryRunner.manager
        .createQueryBuilder(User, 'user')
        .select()
        .where('user.id = :userId', { userId })
        .getOneOrFail();

      await queryRunner.commitTransaction();

      this.eventEmitter.emit(USER_UPDATE_EVENT, userUpdated);

      return { result: true, user: userUpdated };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      return { result: false, error: e.message };
    } finally {
      queryRunner.release();
    }
  }

  async signIn({
    provider,
    token,
    nonce,
  }: SignInReqDTO): Promise<SignInResDTO> {
    try {
      let authInfo: { email: string; id?: string };
      switch (provider) {
        case AuthProvider.KAKAO:
          authInfo = await this.authService.kakaoLogin(token);
          break;

        case AuthProvider.NAVER:
          authInfo = await this.authService.naverLogin(token);
          break;

        case AuthProvider.APPLE:
          authInfo = await this.authService.appleLogin(token, nonce);
          break;

        default:
          break;
      }

      const user = await this.userRepository
        .createQueryBuilder('user')
        .select()
        .where('email = :email', { email: authInfo.email })
        .getOne();

      if (!user) {
        return {
          result: false,
          rejectType: SignInRejectType.SIGN_UP_REQUIRED,
          error: 'Sign up required. Redirection to sign up needed.',
        };
      }

      if (user.status !== UserStatus.ACTIVE) {
        return {
          result: false,
          rejectType: SignInRejectType.INACTIVE,
          error: '로그인 할 수 없는 계정입니다.',
        };
      }

      const { accessToken, refreshToken } = await this.issueTokenAndUpdate(
        user.id,
        user.familyId,
      );

      return { result: true, accessToken, refreshToken, user };
    } catch (e) {
      return {
        result: false,
        rejectType: SignInRejectType.ETC,
        error: e.message,
      };
    }
  }

  async signOut({ userId, familyId }: AuthUserId): Promise<BaseResponseDTO> {
    const queryRunner = this.dataSource.createQueryRunner();

    queryRunner.connect();
    queryRunner.startTransaction();

    try {
      const updateUserResult = await queryRunner.manager
        .createQueryBuilder(User, 'user')
        .update()
        .where('user.id = :userId', { userId })
        .set({ fcmToken: null })
        .updateEntity(false)
        .execute();

      if (updateUserResult.affected !== 1) {
        throw new Error('User update failed.');
      }

      const updateAuthResult = await queryRunner.manager
        .createQueryBuilder(UserAuth, 'auth')
        .update()
        .where('user.id = :userId', { userId })
        .set({ refreshToken: null })
        .updateEntity(false)
        .execute();

      if (updateAuthResult.affected !== 1) {
        throw new Error('UserAuth update failed.');
      }

      this.eventEmitter.emit(USER_SIGN_OUT_EVENT, { familyId, userId });

      return { result: true };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      return { result: false, error: e.message };
    } finally {
      queryRunner.release();
    }
  }

  async refreshToken({
    refreshToken,
  }: RefreshTokenReqDTO): Promise<SignInResDTO> {
    const queryRunner = this.dataSource.createQueryRunner();

    queryRunner.connect();
    queryRunner.startTransaction();

    try {
      const { userId, familyId } = this.authService.verify(refreshToken);

      const userAuth = await queryRunner.manager
        .createQueryBuilder(UserAuth, 'userAuth')
        .select()
        .leftJoin('userAuth.user', 'user', 'user.status = :status', {
          status: UserStatus.ACTIVE,
        })
        .where('userAuth.user.id = :userId', { userId })
        .getOneOrFail();

      if (userAuth.refreshToken !== refreshToken) {
        throw new UnauthorizedException(
          'Refresh Token does not match with token from DB.',
        );
      }

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        await this.issueTokenAndUpdate(
          userId,
          familyId,
          queryRunner.manager.createQueryBuilder(UserAuth, 'userAuth'),
        );

      await queryRunner.commitTransaction();

      return {
        result: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      return { result: false, error: e.message };
    } finally {
      queryRunner.release();
    }
  }

  /**
   * 사용자 60일 뒤 계정 hard delete 시
   * DB 단에서 onDelete Cascade 진행, 이후 재가입 가능
   */
  async withdraw({ familyId, userId }: AuthUserId): Promise<BaseResponseDTO> {
    const queryRunner = this.dataSource.createQueryRunner();

    queryRunner.connect();
    queryRunner.startTransaction();

    try {
      const userUpdatePromise = queryRunner.manager
        .createQueryBuilder(User, 'user')
        .update()
        .where('id = :userId', { userId })
        .set({ status: UserStatus.DELETED, familyId: null, fcmToken: null })
        .updateEntity(false)
        .execute();

      const userAuthPromise = queryRunner.manager
        .createQueryBuilder(UserAuth, 'auth')
        .update()
        .where('userId = :userId', { userId })
        .set({ refreshToken: null })
        .updateEntity(false)
        .execute();

      // photo to deleted
      const photoUpdatePromise = queryRunner.manager
        .createQueryBuilder(Photo, 'photo')
        .update()
        .set({ familyId: null })
        .where('authorId = :userId', { userId })
        .updateEntity(false)
        .execute();

      // photo comment to deleted
      const photoCommentPromise = queryRunner.manager
        .createQueryBuilder(PhotoComment, 'comment')
        .update()
        .set({ status: CommentStatus.DELETED })
        .where('authorId = :userId', { userId })
        .updateEntity(false)
        .execute();

      // message comment to deleted
      const messageCommentPromise = queryRunner.manager
        .createQueryBuilder(MessageComment, 'comment')
        .update()
        .set({ status: CommentStatus.DELETED })
        .where('authorId = :userId', { userId })
        .updateEntity(false)
        .execute();

      await Promise.all([
        userUpdatePromise,
        userAuthPromise,
        photoUpdatePromise,
        photoCommentPromise,
        messageCommentPromise,
      ]);

      this.eventEmitter.emit(USER_WITHDRAW_EVENT, { familyId, userId });

      await queryRunner.commitTransaction();

      return { result: true };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      return { result: false, error: e.message };
    } finally {
      queryRunner.release();
    }
  }

  async issueTokenAndUpdate(
    userId: number,
    familyId: number,
    userAuthQueryBuilder = this.userAuthRepository.createQueryBuilder(
      'userAuth',
    ),
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.authService.sign({
      userId,
      familyId,
      tokenType: TOKEN_TYPE.ACCESS,
    });

    const refreshToken = this.authService.sign({
      userId,
      familyId,
      tokenType: TOKEN_TYPE.REFRESH,
    });

    if (!accessToken || !refreshToken) {
      throw new Error('Token generation failed.');
    }

    const updateResult = await userAuthQueryBuilder
      .update()
      .where('user.id = :userId', { userId })
      .set({ refreshToken })
      .updateEntity(false)
      .execute();

    if (updateResult?.affected !== 1) {
      throw new Error('Cannot update userAuth with new refresh token.');
    }

    return { accessToken, refreshToken };
  }

  async fcmTokenUpdate(
    { userId }: AuthUserId,
    fcmTokenToUpdate: string,
  ): Promise<BaseResponseDTO> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager
        .createQueryBuilder(User, 'user')
        .select()
        .where('user.id = :userId', { userId })
        .getOneOrFail();

      if (user.fcmToken === fcmTokenToUpdate) {
        throw new Error('Unnecessary request for update fcm token.');
      }

      const updateResult = await queryRunner.manager
        .createQueryBuilder(User, 'user')
        .update()
        .where('user.id = :userId', { userId })
        .set({ fcmToken: fcmTokenToUpdate })
        .updateEntity(false)
        .execute();

      if (updateResult.affected !== 1) {
        throw new Error('Cannot update fcm token.');
      }

      user.fcmToken = fcmTokenToUpdate;
      this.eventEmitter.emit(USER_FCM_UPDATED_EVENT, user);

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }
}

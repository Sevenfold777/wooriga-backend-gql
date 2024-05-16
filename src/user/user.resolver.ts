import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { SignInResDTO } from './dto/sign-in-res.dto';
import { RefreshTokenReqDTO } from './dto/refresh-token-req.dto';
import { SignInReqDTO } from './dto/sign-in-req.dto';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { SignUpResDTO } from './dto/sign-up-res.dto';
import { SignUpReqDTO } from './dto/sign-up-req.dto';
import { EditUserReqDTO } from './dto/edit-user-req.dto';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => User)
  findMyProfile(@AuthUser() user: AuthUserId): Promise<User> {
    return this.userService.myProfile(user);
  }

  @Public()
  @Mutation(() => SignUpResDTO)
  signUp(
    @Args('reqDTO', { type: () => SignUpReqDTO }) signUpReqDTO: SignUpReqDTO,
  ): Promise<SignUpResDTO> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  editUser(
    @AuthUser() user: AuthUserId,
    @Args('reqDTO', { type: () => EditUserReqDTO })
    editUserReqDTO: EditUserReqDTO,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  @Public()
  @Mutation(() => SignInResDTO)
  signIn(
    @Args('reqDTO', { type: () => SignInReqDTO }) signInReqDTO: SignInReqDTO,
  ): Promise<SignInResDTO> {
    return null;
  }

  @Public()
  @Mutation(() => SignInResDTO)
  refreshToken(
    @Args('reqDTO', { type: () => RefreshTokenReqDTO })
    refreshTokenReqDTO: RefreshTokenReqDTO,
  ): Promise<SignInResDTO> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  withdraw(@AuthUser() user: AuthUserId): Promise<BaseResponseDTO> {
    return null;
  }
}

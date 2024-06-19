import { Args, Query, Resolver } from '@nestjs/graphql';
import { UserService } from './user.service';
import { User } from 'src/user/entities/user.entity';
import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { CountResDTO } from '../dto/count-res.dto';
import { DauListResDTO } from '../dto/dau-list-res.dto';
import { MauListResDTO } from '../dto/mau-list-res.dto';
import { UserDetailsResDTO } from '../dto/user-details-res.dto';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => CountResDTO)
  getUsersCount(): Promise<CountResDTO> {
    return this.userService.getUsersCount();
  }

  @Query(() => CountResDTO)
  getDau(): Promise<CountResDTO> {
    return this.userService.getDau();
  }

  @Query(() => CountResDTO)
  getMau(): Promise<CountResDTO> {
    return this.userService.getMau();
  }

  @Query(() => UserDetailsResDTO)
  getUsersDetails(
    @Args() paginationReqDTO: PaginationReqDTO,
  ): Promise<UserDetailsResDTO> {
    return this.userService.getUsersDetails(paginationReqDTO);
  }

  @Query(() => DauListResDTO)
  getDauHistory(
    @Args() paginationReqDTO: PaginationReqDTO,
  ): Promise<DauListResDTO> {
    return this.userService.getDauHistory(paginationReqDTO);
  }

  @Query(() => MauListResDTO)
  getMauHistory(
    @Args() paginationReqDTO: PaginationReqDTO,
  ): Promise<MauListResDTO> {
    return this.userService.getMauHistory(paginationReqDTO);
  }
}

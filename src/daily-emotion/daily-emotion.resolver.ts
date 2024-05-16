import { Mutation, Query, Resolver, Args, Int } from '@nestjs/graphql';
import { DailyEmotionService } from './daily-emotion.service';
import { DailyEmotion } from './entities/daily-emotion.entity';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { CreateDailyEmoReqDTO } from './dto/create-daily-emo-req.dto';
import { EditDailyEmoReqDTO } from './dto/edit-daily-emo-req.dto';
import { DailyEmoByDateResDTO } from './dto/daily-emo-by-date-res.dto';

@Resolver(() => DailyEmotion)
export class DailyEmotionResolver {
  constructor(private readonly dailyEmotionService: DailyEmotionService) {}

  @Query(() => DailyEmotion)
  findMyEmotionToday(@AuthUser() user: AuthUserId): Promise<DailyEmotion> {
    return null;
  }

  @Query(() => [DailyEmotion])
  findFamilyEmotionsToday(
    @AuthUser() user: AuthUserId,
  ): Promise<DailyEmotion[]> {
    return null;
  }

  @Query(() => [DailyEmoByDateResDTO])
  findFamilyEmotions(
    @AuthUser() user: AuthUserId,
    @Args('prev', { type: () => Int }) prev: number,
  ): Promise<DailyEmoByDateResDTO[]> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  createDailyEmotion(
    @AuthUser() user: AuthUserId,
    @Args('reqDTO') createDailyEmoReqDTO: CreateDailyEmoReqDTO,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  deleteDailyEmotion(
    @AuthUser() user: AuthUserId,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  editDailyEmotion(
    @AuthUser() user: AuthUserId,
    @Args('reqDTO') editDailyEmoReqDTO: EditDailyEmoReqDTO,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  pokeFamilyEmotion(
    @AuthUser() user: AuthUserId,
    @Args('targetId', { type: () => Int }) targetId: number,
  ): Promise<BaseResponseDTO> {
    return null;
  }
}

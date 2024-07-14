import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { ChooseDailyEmoReqDTO } from './dto/choose-daily-emo-req.dto';
import { DailyEmoByDateResDTO } from './dto/daily-emo-by-date-res.dto';
import { DailyEmoResDTO } from './dto/daily-emo-res.dto';
import { DailyEmosResDTO } from './dto/daily-emos-res.dto';
import { PaginationByDateReqDTO } from './dto/pagination-by-date-req.dto';

export interface DailyEmotionService {
  findMyEmotionToday({ userId }: AuthUserId): Promise<DailyEmoResDTO>;

  findFamilyEmotionsToday(user: AuthUserId): Promise<DailyEmosResDTO>;

  findFamilyEmotions(
    user: AuthUserId,
    paginationDTO: PaginationByDateReqDTO,
  ): Promise<DailyEmoByDateResDTO>;

  chooseEmotion(
    user: AuthUserId,
    reqDTO: ChooseDailyEmoReqDTO,
  ): Promise<BaseResponseDTO>;

  deleteEmotion(user: AuthUserId): Promise<BaseResponseDTO>;

  pokeFamilyEmotion(
    user: AuthUserId,
    targetId: number,
  ): Promise<BaseResponseDTO>;
}

export const DailyEmotionService = Symbol('DailyEmotionService');

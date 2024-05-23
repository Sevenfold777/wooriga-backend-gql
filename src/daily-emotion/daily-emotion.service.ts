import { Injectable } from '@nestjs/common';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { ChooseDailyEmoReqDTO } from './dto/choose-daily-emo-req.dto';
import { DailyEmoByDateResDTO } from './dto/daily-emo-by-date-res.dto';
import { DailyEmoResDTO } from './dto/daily-emo-res.dto';
import { DailyEmosResDTO } from './dto/daily-emos-res.dto';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DailyEmotion } from './entities/daily-emotion.entity';
import { DataSource, Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { UserStatus } from 'src/user/constants/user-status.enum';
import { PaginationByDateReqDTO } from './dto/pagination-by-date-req.dto';
import { DailyEmoByDateDTO } from './dto/daily-emo-by-date.dto';

@Injectable()
export class DailyEmotionService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @InjectRepository(DailyEmotion)
    private dailyEmoRepository: Repository<DailyEmotion>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findMyEmotionToday({ userId }: AuthUserId): Promise<DailyEmoResDTO> {
    const today = new Date(new Date().toLocaleDateString('ko-KR'));

    try {
      const dailyEmotion = await this.dailyEmoRepository
        .createQueryBuilder('emo')
        .select()
        .where('date = :date', { date: today })
        .andWhere('emo.user.id = :userId', { userId })
        .getOneOrFail();

      return { result: true, dailyEmotion };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async findFamilyEmotionsToday({
    familyId,
  }: AuthUserId): Promise<DailyEmosResDTO> {
    const today = new Date(new Date().toLocaleDateString('ko-KR'));

    try {
      const dailyEmotions = await this.dailyEmoRepository
        .createQueryBuilder('emo')
        .select()
        .innerJoinAndSelect('emo.user', 'user', 'user.familyId = :familyId', {
          familyId,
        })
        .where('date = :date', { date: today })
        .getMany();

      return { result: true, dailyEmotions };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async findFamilyEmotions(
    { familyId }: AuthUserId,
    { take, prevDate }: PaginationByDateReqDTO,
  ): Promise<DailyEmoByDateResDTO> {
    const startDate = new Date(prevDate.getTime() - 1000 * 60 * 60 * 24 * take); // 검색 시작일
    const dailyEmotionsByDate: DailyEmoByDateDTO[] = [];

    try {
      const dailyEmotions = await this.dailyEmoRepository
        .createQueryBuilder('emo')
        .select()
        .innerJoinAndSelect('emo.user', 'user', 'user.familyId = :familyId', {
          familyId,
        })
        .where('emo.date < :end', { end: prevDate })
        .andWhere('emo.date >= :start', { start: startDate })
        .orderBy('emo.date', 'DESC')
        .getMany();

      for (const emo of dailyEmotions) {
        const idx = dailyEmotionsByDate.findIndex(
          (emoByDate) => emoByDate.date.getTime() === emo.date.getTime(),
        );

        if (idx === -1) {
          const emoByDateNew = new DailyEmoByDateDTO();
          emoByDateNew.dailyEmotions = [];

          emoByDateNew.date = emo.date;
          emoByDateNew.dailyEmotions.push(emo);

          dailyEmotionsByDate.push(emoByDateNew);
        } else {
          dailyEmotionsByDate[idx].dailyEmotions.push(emo);
        }
      }

      return { result: true, dailyEmotionsByDate };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async chooseDailyEmotion(
    { userId }: AuthUserId,
    { type }: ChooseDailyEmoReqDTO,
  ): Promise<BaseResponseDTO> {
    try {
      const today = new Date(new Date().toLocaleDateString('ko-KR'));

      const emotion = this.dailyEmoRepository.create({
        type,
        date: today,
        user: { id: userId },
      });

      // upsert 위해 query builder 대신 repo.save 사용
      await this.dailyEmoRepository.save(emotion, {
        reload: false,
        transaction: false,
      });

      // TODO: send notification

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async deleteDailyEmotion({ userId }: AuthUserId): Promise<BaseResponseDTO> {
    const today = new Date(new Date().toLocaleDateString('ko-KR'));

    const queryRunner = this.dataSource.createQueryRunner();

    queryRunner.connect();
    queryRunner.startTransaction();

    try {
      const deleteResult = await this.dailyEmoRepository
        .createQueryBuilder('emo')
        .delete()
        .from(DailyEmotion)
        .where('date = :today', { today })
        .andWhere('user.id = :userId', { userId })
        .execute();

      if (deleteResult.affected !== 1) {
        throw new Error(
          'Cannot delete the daily emotion. Might be due to invalid emotionId or unauthenticated user.',
        );
      }

      await queryRunner.commitTransaction();

      return { result: true };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      return { result: false, error: e.message };
    } finally {
      queryRunner.release();
    }
  }

  async pokeFamilyEmotion(
    { familyId }: AuthUserId,
    targetId: number,
  ): Promise<BaseResponseDTO> {
    try {
      const targetUser = await this.userRepository
        .createQueryBuilder('user')
        .select()
        .where('id = :targetId', { targetId })
        .andWhere('family.id = :familyId', { familyId })
        .andWhere('status = :status', { status: UserStatus.ACTIVE })
        .getOneOrFail();

      // TODO: send notification

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }
}

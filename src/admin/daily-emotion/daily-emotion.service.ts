import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DailyEmotion } from 'src/daily-emotion/entities/daily-emotion.entity';
import { Repository } from 'typeorm';
import { CountResDTO } from '../dto/count-res.dto';

@Injectable()
export class DailyEmotionService {
  constructor(
    @InjectRepository(DailyEmotion)
    private readonly dailyEmotionRepository: Repository<DailyEmotion>,
  ) {}

  async getEmotionCreateCount(): Promise<CountResDTO> {
    try {
      const todayBegin = new Date(new Date().toLocaleDateString('ko-KR'));

      const emotionTodayCount = await this.dailyEmotionRepository
        .createQueryBuilder('emo')
        .where('emo.createdAt >= :todayBegin', { todayBegin })
        .getCount();

      return { result: true, count: emotionTodayCount };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }
}

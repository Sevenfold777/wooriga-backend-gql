import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Letter } from 'src/letter/entities/letter.entity';
import { Repository } from 'typeorm';
import { CountResDTO } from '../dto/count-res.dto';

@Injectable()
export class LetterService {
  constructor(
    @InjectRepository(Letter)
    private readonly letterRepository: Repository<Letter>,
  ) {}

  async getLetterCreateCount(): Promise<CountResDTO> {
    try {
      const todayBegin = new Date(new Date().toLocaleDateString('ko-KR'));

      const letterTodayCount = await this.letterRepository
        .createQueryBuilder('letter')
        .where('letter.createdAt >= :todayBegin', { todayBegin })
        .getCount();

      return { result: true, count: letterTodayCount };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getTimeCapsuleCreateCount(): Promise<CountResDTO> {
    try {
      const todayBegin = new Date(new Date().toLocaleDateString('ko-KR'));

      const tcTodayCount = await this.letterRepository
        .createQueryBuilder('letter')
        .where('letter.createdAt >= :todayBegin', { todayBegin })
        .andWhere('letter.isTimeCapsule = true')
        .getCount();

      return { result: true, count: tcTodayCount };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }
}

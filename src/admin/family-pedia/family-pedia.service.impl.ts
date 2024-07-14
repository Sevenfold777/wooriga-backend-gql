import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FamilyPediaQuestion } from 'src/family-pedia/entities/family-pedia-question';
import { FamilyPedia } from 'src/family-pedia/entities/family-pedia.entity';
import { Repository } from 'typeorm';
import { CountResDTO } from '../dto/count-res.dto';
import { FamilyPediaService } from './family-pedia.service';

@Injectable()
export class FamilyPediaServiceImpl implements FamilyPediaService {
  constructor(
    @InjectRepository(FamilyPedia)
    private readonly familyPediaRepository: Repository<FamilyPedia>,
    @InjectRepository(FamilyPediaQuestion)
    private readonly familyPediaQuestionRepository: Repository<FamilyPediaQuestion>,
  ) {}

  async getPediaEditCount(): Promise<CountResDTO> {
    try {
      const todayBegin = new Date(new Date().toLocaleDateString('ko-KR'));

      const pediaEditCount = await this.familyPediaRepository
        .createQueryBuilder('pedia')
        .where('pedia.updatedAt >= :todayBegin', { todayBegin })
        .getCount();

      const questionEditCount = await this.familyPediaQuestionRepository
        .createQueryBuilder('question')
        .where('question.updatedAt >= :todayBegin', { todayBegin })
        .getCount();

      return { result: true, count: pediaEditCount + questionEditCount };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }
}

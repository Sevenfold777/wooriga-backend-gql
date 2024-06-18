import { Query, Resolver } from '@nestjs/graphql';
import { LetterService } from './letter.service';
import { CountResDTO } from '../dto/count-res.dto';
import { Letter } from 'src/letter/entities/letter.entity';

@Resolver(() => Letter)
export class LetterResolver {
  constructor(private readonly letterService: LetterService) {}

  @Query(() => CountResDTO)
  getLetterCreateCount(): Promise<CountResDTO> {
    return this.letterService.getLetterCreateCount();
  }

  @Query(() => CountResDTO)
  getTimeCapsuleCreateCount(): Promise<CountResDTO> {
    return this.letterService.getTimeCapsuleCreateCount();
  }
}

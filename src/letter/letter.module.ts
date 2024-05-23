import { Module } from '@nestjs/common';
import { LetterService } from './letter.service';
import { LetterResolver } from './letter.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Letter } from './entities/letter.entity';
import { LetterGuide } from './entities/letter-guide.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Letter, LetterGuide])],
  providers: [LetterResolver, LetterService],
})
export class LetterModule {}

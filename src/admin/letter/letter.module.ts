import { Module } from '@nestjs/common';
import { LetterService } from './letter.service';
import { LetterResolver } from './letter.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Letter } from 'src/letter/entities/letter.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Letter])],
  providers: [LetterResolver, LetterService],
})
export class LetterModule {}

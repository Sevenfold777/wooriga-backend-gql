import { Module } from '@nestjs/common';
import { LetterService } from './letter.service';
import { LetterResolver } from './letter.resolver';

@Module({
  providers: [LetterResolver, LetterService],
})
export class LetterModule {}

import { Resolver } from '@nestjs/graphql';
import { LetterService } from './letter.service';

@Resolver()
export class LetterResolver {
  constructor(private readonly letterService: LetterService) {}
}

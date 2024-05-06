import { Test, TestingModule } from '@nestjs/testing';
import { EmotionResolver } from '../emotion.resolver';
import { EmotionService } from '../emotion.service';

describe('EmotionResolver', () => {
  let resolver: EmotionResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmotionResolver, EmotionService],
    }).compile();

    resolver = module.get<EmotionResolver>(EmotionResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

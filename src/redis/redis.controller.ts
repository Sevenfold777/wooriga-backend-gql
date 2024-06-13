import { Controller, Post } from '@nestjs/common';
import { Public } from 'src/auth/decorators/public.decorator';
import { RedisService } from './redis.service';

@Controller('redis')
export class RedisController {
  constructor(private readonly rediceService: RedisService) {}

  @Public()
  @Post()
  setItem() {
    return this.rediceService.setItem();
  }
}

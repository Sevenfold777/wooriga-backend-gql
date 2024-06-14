import { Module } from '@nestjs/common';
import { RedisFamilyMemberController } from './redis-family-member.controller';
import { RedisFamilyMemberService } from './redis-family-member.service';

@Module({
  controllers: [RedisFamilyMemberController],
  providers: [RedisFamilyMemberService],
})
export class RedisFamilyMemberModule {}

import { Module } from '@nestjs/common';
import { RedisFamilyMemberService } from './redis-family-member.service';

@Module({
  providers: [RedisFamilyMemberService],
  exports: [RedisFamilyMemberService],
})
export class RedisFamilyMemberModule {}

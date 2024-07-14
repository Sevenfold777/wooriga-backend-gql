import { Module } from '@nestjs/common';
import { RedisFamilyMemberService } from './redis-family-member.service';
import { RedisFamilyMemberServiceImpl } from './redis-family-member.service.impl';

@Module({
  providers: [
    {
      provide: RedisFamilyMemberService,
      useClass: RedisFamilyMemberServiceImpl,
    },
  ],
  exports: [RedisFamilyMemberService],
})
export class RedisFamilyMemberModule {}

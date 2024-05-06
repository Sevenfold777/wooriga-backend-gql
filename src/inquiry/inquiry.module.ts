import { Module } from '@nestjs/common';
import { InquiryService } from './inquiry.service';
import { InquiryResolver } from './inquiry.resolver';

@Module({
  providers: [InquiryResolver, InquiryService],
})
export class InquiryModule {}

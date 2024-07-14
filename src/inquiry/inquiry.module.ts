import { Module } from '@nestjs/common';
import { InquiryService } from './inquiry.service';
import { InquiryResolver } from './inquiry.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from './entities/inquiry.entity';
import { InquiryServiceImpl } from './inquiry.service.impl';

@Module({
  imports: [TypeOrmModule.forFeature([Inquiry])],
  providers: [
    InquiryResolver,
    { provide: InquiryService, useClass: InquiryServiceImpl },
  ],
})
export class InquiryModule {}

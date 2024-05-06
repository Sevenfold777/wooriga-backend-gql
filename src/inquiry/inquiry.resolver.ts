import { Resolver } from '@nestjs/graphql';
import { InquiryService } from './inquiry.service';

@Resolver()
export class InquiryResolver {
  constructor(private readonly inquiryService: InquiryService) {}
}

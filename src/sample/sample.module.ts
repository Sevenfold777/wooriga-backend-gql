import { Module } from '@nestjs/common';
import { SampleService } from './sample.service';
import { SampleResolver } from './sample.resolver';

/** generated res by nest cli (graphql code-first) */
@Module({
  providers: [SampleResolver, SampleService],
})
export class SampleModule {}

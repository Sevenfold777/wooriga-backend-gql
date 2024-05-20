import { Module } from '@nestjs/common';
import { SampleService } from './sample.service';
import { SampleResolver } from './sample.resolver';
import { SampleController } from './sample.controller';

/** generated res by nest cli (graphql code-first) */
@Module({
  providers: [SampleResolver, SampleService],
  controllers: [SampleController],
})
export class SampleModule {}

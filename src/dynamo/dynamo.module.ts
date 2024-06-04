import { Module } from '@nestjs/common';
import { DynamoService } from './dynamo.service';

@Module({
  providers: [DynamoService],
})
export class DynamoModule {}

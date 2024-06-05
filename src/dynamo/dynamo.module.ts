import { Module } from '@nestjs/common';
import { DynamoService } from './dynamo.service';
import { DynamoUserService } from './dynamo-user.service';

@Module({
  providers: [DynamoService, DynamoUserService],
  exports: [DynamoUserService],
})
export class DynamoModule {}

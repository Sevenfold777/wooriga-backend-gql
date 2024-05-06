import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserAuth } from './entities/user-auth.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserAuth])],
  providers: [UserResolver, UserService],
})
export class UserModule {}

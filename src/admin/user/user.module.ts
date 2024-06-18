import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAuth } from 'src/user/entities/user-auth.entity';
import { User } from 'src/user/entities/user.entity';
import { DAU } from '../entities/dau.entity';
import { MAU } from '../entities/mau.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DAU, MAU, User, UserAuth])],
  providers: [UserResolver, UserService],
})
export class UserModule {}

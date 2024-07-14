import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAuth } from 'src/user/entities/user-auth.entity';
import { User } from 'src/user/entities/user.entity';
import { DAU } from './entities/dau.entity';
import { MAU } from './entities/mau.entity';
import { UserServiceImpl } from './user.service.impl';

@Module({
  imports: [TypeOrmModule.forFeature([DAU, MAU, User, UserAuth])],
  providers: [
    UserResolver,
    { provide: UserService, useClass: UserServiceImpl },
  ],
})
export class UserModule {}

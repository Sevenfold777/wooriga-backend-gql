import { Module } from '@nestjs/common';
import { UserServiceImpl } from './user.service.impl';
import { UserResolver } from './user.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserAuth } from './entities/user-auth.entity';
import { AuthModule } from 'src/auth/auth.module';
import { FamilyModule } from 'src/family/family.module';
import { FamilyPediaModule } from 'src/family-pedia/family-pedia.module';
import { MessageComment } from 'src/message/entities/message-comment.entity';
import { PhotoComment } from 'src/photo/entities/photo-comment.entity';
import { Photo } from 'src/photo/entities/photo.entity';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserAuth,
      Photo,
      PhotoComment,
      MessageComment,
    ]),
    AuthModule,
    FamilyModule,
    FamilyPediaModule,
  ],
  providers: [
    UserResolver,
    { provide: UserService, useClass: UserServiceImpl },
  ],
})
export class UserModule {}

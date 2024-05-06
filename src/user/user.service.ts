import { Injectable } from '@nestjs/common';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UserStatus } from './constants/user-status.enum';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async myProfile({ userId }: AuthUserId): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId, status: UserStatus.ACTIVE },
      //   relations: { family: true },
    });

    return user;
  }
}

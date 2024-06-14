import { Controller, Delete, Post } from '@nestjs/common';
import { Public } from 'src/auth/decorators/public.decorator';
import { RedisFamilyMemberService } from './redis-family-member.service';
import { RedisFamilyMember } from './entities/redis-family-member.entity';

@Controller('redis')
export class RedisFamilyMemberController {
  constructor(
    private readonly redisFamilyMemberService: RedisFamilyMemberService,
  ) {}

  @Public()
  @Post()
  setItem() {
    const item = new RedisFamilyMember();
    item.familyId = 10002;
    item.userId = 20004;
    item.userName = 'new_name!';
    item.fcmToken = 'test fcm token';
    item.mktPushAgreed = false;

    return this.redisFamilyMemberService.setItem(item);
  }

  @Public()
  @Delete()
  deleteFamily() {
    const familyId = 10002;
    return this.redisFamilyMemberService.deleteFamily({ familyId });
  }

  @Public()
  @Delete('/user')
  deleteUser() {
    const familyId = 10002;
    const userId = 20004;
    return this.redisFamilyMemberService.deleteUser({ familyId, userId });
  }
}

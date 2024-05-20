import { Controller, Get } from '@nestjs/common';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';

@Controller('sample')
export class SampleController {
  @Get()
  sample(@AuthUser() user: AuthUserId) {
    console.log(user);
  }
}

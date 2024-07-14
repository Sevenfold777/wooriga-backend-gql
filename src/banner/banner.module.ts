import { Module } from '@nestjs/common';
import { BannerService } from './banner.service';
import { BannerResolver } from './banner.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Banner } from './entities/banner.entity';
import { BannerServiceImpl } from './banner.service.impl';

@Module({
  imports: [TypeOrmModule.forFeature([Banner])],
  providers: [
    BannerResolver,
    { provide: BannerService, useClass: BannerServiceImpl },
  ],
})
export class BannerModule {}

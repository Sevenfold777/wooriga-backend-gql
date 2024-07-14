import { Args, Query, Resolver } from '@nestjs/graphql';
import { BannerService } from './banner.service';
import { BannerReqDTO } from './dto/banner-req.dto';
import { BannersResDTO } from './dto/banners-res.dto';
import { Inject } from '@nestjs/common';

@Resolver()
export class BannerResolver {
  constructor(
    @Inject(BannerService)
    private readonly bannerService: BannerService,
  ) {}

  @Query(() => BannersResDTO)
  findBanners(@Args() bannerReqDTO: BannerReqDTO): Promise<BannersResDTO> {
    return this.bannerService.findBanners(bannerReqDTO);
  }
}

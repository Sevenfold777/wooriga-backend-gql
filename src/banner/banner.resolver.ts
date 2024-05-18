import { Args, Query, Resolver } from '@nestjs/graphql';
import { BannerService } from './banner.service';
import { Banner } from './entities/banner.entity';
import { BannerReqDTO } from './dto/banner-req.dto';

@Resolver()
export class BannerResolver {
  constructor(private readonly bannerService: BannerService) {}

  @Query(() => [Banner])
  findBanners(@Args('reqDTO') bannerReqDTO: BannerReqDTO): Promise<Banner[]> {
    return null;
  }
}

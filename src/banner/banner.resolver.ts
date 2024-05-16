import { Args, Query, Resolver } from '@nestjs/graphql';
import { BannerService } from './banner.service';
import { Banner } from './entities/banner.entity';
import { FindBannerReqDTO } from './dto/find-banner-req.dto';

@Resolver()
export class BannerResolver {
  constructor(private readonly bannerService: BannerService) {}

  @Query(() => [Banner])
  findBanners(
    @Args('reqDTO') findBannerReqDTO: FindBannerReqDTO,
  ): Promise<Banner[]> {
    return null;
  }
}

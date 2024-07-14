import { BannerReqDTO } from './dto/banner-req.dto';
import { BannersResDTO } from './dto/banners-res.dto';

export interface BannerService {
  findBanners(reqDTO: BannerReqDTO): Promise<BannersResDTO>;
}

export const BannerService = Symbol('BannerService');

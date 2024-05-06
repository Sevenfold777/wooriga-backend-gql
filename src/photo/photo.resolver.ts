import { Resolver } from '@nestjs/graphql';
import { PhotoService } from './photo.service';

@Resolver()
export class PhotoResolver {
  constructor(private readonly photoService: PhotoService) {}
}

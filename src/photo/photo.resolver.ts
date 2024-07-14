import {
  Args,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { PhotoService } from './photo.service';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { PhotoCommentReqDTO } from './dto/photo-comment-req.dto';
import { EditPhotoReqDTO } from './dto/edit-photo-req.dto';
import { PhotosResDTO } from './dto/photos-res.dto';
import { PhotoResDTO } from './dto/photo-res.dto';
import { PhotoCommentsResDTO } from './dto/photo-comments-res.dto';
import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { CreatePhotoCommentReqDTO } from './dto/create-photo-comment-req.dto';
import { Photo } from './entities/photo.entity';
import { PhotoFileMetaDataDTO } from './dto/photo-file-metadata.dto';
import { PhotoCommentMetaDataDTO } from './dto/photo-comment-metadata.dto';
import { CreateResDTO } from 'src/common/dto/create-res.dto';
import { CreatePhotoResDTO } from './dto/create-photo-res.dto';
import { CreatePhotoReqDTO } from './dto/create-photo-req.dto';
import { PhotoFileUploadCompletedReqDTO } from './dto/photo-file-upload-completed-req.dto';
import { Inject } from '@nestjs/common';

@Resolver(() => Photo)
export class PhotoResolver {
  constructor(
    @Inject(PhotoService) private readonly photoService: PhotoService,
  ) {}

  @Mutation(() => CreatePhotoResDTO)
  createPhoto(
    @AuthUser() user: AuthUserId,
    @Args() createPhotoReqDTO: CreatePhotoReqDTO,
  ): Promise<CreatePhotoResDTO> {
    return this.photoService.createPhoto(user, createPhotoReqDTO);
  }

  @Mutation(() => BaseResponseDTO)
  fileUploadCompleted(
    @AuthUser() user: AuthUserId,
    @Args() fileUploadCompletedReqDTO: PhotoFileUploadCompletedReqDTO,
  ): Promise<BaseResponseDTO> {
    return this.photoService.fileUploadCompleted(
      user,
      fileUploadCompletedReqDTO,
    );
  }

  @Mutation(() => BaseResponseDTO)
  deletePhoto(
    @AuthUser() user: AuthUserId,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<BaseResponseDTO> {
    return this.photoService.deletePhoto(user, id);
  }

  /**
   * 운영정책 상 photo file은 수정(추가/삭제) 불가
   * 해당 기능이 필요하다면, 사용자는 게시글 삭제하고 사진 다시 선택해서 올려야
   */
  @Mutation(() => BaseResponseDTO)
  editPhoto(
    @AuthUser() user: AuthUserId,
    @Args() editPhotoReqDTO: EditPhotoReqDTO,
  ): Promise<BaseResponseDTO> {
    return this.photoService.editPhoto(user, editPhotoReqDTO);
  }

  @Query(() => PhotosResDTO)
  findPhotos(
    @AuthUser() user: AuthUserId,
    @Args() paginationReqDTO: PaginationReqDTO,
  ): Promise<PhotosResDTO> {
    return this.photoService.findPhotos(user, paginationReqDTO);
  }

  @Query(() => PhotoResDTO)
  findPhoto(
    @AuthUser() user: AuthUserId,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<PhotoResDTO> {
    return this.photoService.findPhoto(user, id);
  }

  @Mutation(() => BaseResponseDTO)
  likePhoto(
    @AuthUser() user: AuthUserId,
    @Args('photoId', { type: () => Int }) photoId: number,
  ): Promise<BaseResponseDTO> {
    return this.photoService.likePhoto(user, photoId);
  }

  @Mutation(() => BaseResponseDTO)
  unlikePhoto(
    @AuthUser() user: AuthUserId,
    @Args('photoId', { type: () => Int }) photoId: number,
  ): Promise<BaseResponseDTO> {
    return this.photoService.unlikePhoto(user, photoId);
  }

  @Mutation(() => CreateResDTO)
  commentPhoto(
    @AuthUser() user: AuthUserId,
    @Args() createCommentReqDTO: CreatePhotoCommentReqDTO,
  ): Promise<CreateResDTO> {
    return this.photoService.commentPhoto(user, createCommentReqDTO);
  }

  @Mutation(() => BaseResponseDTO)
  deletePhotoComment(
    @AuthUser() user: AuthUserId,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<BaseResponseDTO> {
    return this.photoService.deletePhotoComment(user, id);
  }

  @Query(() => PhotoCommentsResDTO)
  findPhotoComments(
    @AuthUser() user: AuthUserId,
    @Args() photoCommentReqDTO: PhotoCommentReqDTO,
  ): Promise<PhotoCommentsResDTO> {
    return this.photoService.findPhotoComments(user, photoCommentReqDTO);
  }

  @ResolveField(() => PhotoFileMetaDataDTO, { name: 'fileMetaData' })
  getFileMetaData(@Parent() photo: Photo): Promise<PhotoFileMetaDataDTO> {
    return this.photoService.getFileMetaData(photo);
  }

  @ResolveField(() => PhotoCommentMetaDataDTO, { name: 'commentMetaData' })
  getCommentMetaData(@Parent() photo: Photo): Promise<PhotoCommentMetaDataDTO> {
    return this.photoService.getCommentMetaData(photo);
  }
}

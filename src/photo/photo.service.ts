import { PhotoFileUploadCompletedReqDTO } from './dto/photo-file-upload-completed-req.dto';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { EditPhotoReqDTO } from './dto/edit-photo-req.dto';
import { PhotoCommentReqDTO } from './dto/photo-comment-req.dto';
import { PhotoCommentsResDTO } from './dto/photo-comments-res.dto';
import { PhotoResDTO } from './dto/photo-res.dto';
import { PhotosResDTO } from './dto/photos-res.dto';
import { Photo } from './entities/photo.entity';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { CreateResDTO } from 'src/common/dto/create-res.dto';
import { CreatePhotoCommentReqDTO } from './dto/create-photo-comment-req.dto';
import { PhotoFileMetaDataDTO } from './dto/photo-file-metadata.dto';
import { PhotoCommentMetaDataDTO } from './dto/photo-comment-metadata.dto';
import { CreatePhotoReqDTO } from './dto/create-photo-req.dto';
import { CreatePhotoResDTO } from './dto/create-photo-res.dto';

export interface PhotoService {
  createPhoto(
    user: AuthUserId,
    reqDTO: CreatePhotoReqDTO,
  ): Promise<CreatePhotoResDTO>;

  fileUploadCompleted(
    user: AuthUserId,
    reqDTO: PhotoFileUploadCompletedReqDTO,
  ): Promise<BaseResponseDTO>;

  deletePhoto(user: AuthUserId, id: number): Promise<BaseResponseDTO>;

  /**
   * 운영정책 상 photo file은 수정(추가/삭제) 불가
   * 해당 기능이 필요하다면, 사용자는 게시글 삭제하고 사진 다시 선택해서 올려야
   */
  editPhoto(
    user: AuthUserId,
    reqDTO: EditPhotoReqDTO,
  ): Promise<BaseResponseDTO>;

  findPhotos(
    user: AuthUserId,
    paginationDTO: PaginationReqDTO,
  ): Promise<PhotosResDTO>;

  findPhoto(user: AuthUserId, id: number): Promise<PhotoResDTO>;

  likePhoto(user: AuthUserId, photoId: number): Promise<BaseResponseDTO>;

  unlikePhoto(user: AuthUserId, photoId: number): Promise<BaseResponseDTO>;

  commentPhoto(
    user: AuthUserId,
    { photoId, payload }: CreatePhotoCommentReqDTO,
  ): Promise<CreateResDTO>;

  /**
   * delete comment에서는 familiy validation 하지 않음
   * 이미 작성된 댓글은 작성한 사용자에게 권한이 귀속
   */
  deletePhotoComment(user: AuthUserId, id: number): Promise<BaseResponseDTO>;

  findPhotoComments(
    user: AuthUserId,
    reqDTO: PhotoCommentReqDTO,
  ): Promise<PhotoCommentsResDTO>;

  /**
   * ResolveField 호출 (findPhotos 필요에 의해 작성)
   * @param photo fileMetadata를 찾을 대상 photo
   * @returns photo와 연관된 file들에 대한 메타데이터 반환 {thumbnailUrl: string, filesCount: number}
   */
  getFileMetaData(photo: Photo): Promise<PhotoFileMetaDataDTO>;

  /**
   * ResolveField 호출 (findPhoto 필요성에 의해 작성)
   * @param photo CommentMetadata를 찾을 대상 photo
   * @returns photo와 연관된 comment들에 대한 메타데이터 반환 {commentsCount: number, commentsPreview: Comment[]}
   */
  getCommentMetaData(photo: Photo): Promise<PhotoCommentMetaDataDTO>;
}

export const PhotoService = Symbol('PhotoService');

import { SqsNotificationService } from './../sqs-notification/sqs-notification.service';
import { Injectable } from '@nestjs/common';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { EditPhotoReqDTO } from './dto/edit-photo-req.dto';
import { PhotoCommentReqDTO } from './dto/photo-comment-req.dto';
import { PhotoCommentsResDTO } from './dto/photo-comments-res.dto';
import { PhotoResDTO } from './dto/photo-res.dto';
import { PhotosResDTO } from './dto/photos-res.dto';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PhotoComment } from './entities/photo-comment.entity';
import { PhotoFile } from './entities/photo-file.entity';
import { PhotoLike } from './entities/photo-like.entity';
import { Photo } from './entities/photo.entity';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { CreateResDTO } from 'src/common/dto/create-res.dto';
import { CreatePhotoCommentReqDTO } from './dto/create-photo-comment-req.dto';
import { CommentStatus } from 'src/common/constants/comment-status.enum';
import { PhotoFileMetaDataDTO } from './dto/photo-file-metadata.dto';
import * as DataLoader from 'dataloader';
import { PhotoCommentMetaDataDTO } from './dto/photo-comment-metadata.dto';
import { SqsNotificationProduceDTO } from 'src/sqs-notification/dto/sqs-notification-produce.dto';
import { NotificationType } from 'src/sqs-notification/constants/notification-type';

@Injectable()
export class PhotoService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @InjectRepository(Photo) private photoRepository: Repository<Photo>,
    @InjectRepository(PhotoFile) private fileRespository: Repository<PhotoFile>,
    @InjectRepository(PhotoLike) private likeRepository: Repository<PhotoLike>,
    @InjectRepository(PhotoComment)
    private commentRepository: Repository<PhotoComment>,
    private readonly sqsNotificationService: SqsNotificationService,
  ) {}

  async deletePhoto(
    { userId, familyId }: AuthUserId,
    id: number,
  ): Promise<BaseResponseDTO> {
    try {
      // TODO: handle S3 photo files
      // TODO: delete comments

      const deleteResult = await this.photoRepository
        .createQueryBuilder('photo')
        .delete()
        .from(Photo)
        .where('id = :id', { id })
        .andWhere('author.id = :userId', { userId })
        .andWhere('family.id = :familyId', { familyId })
        .execute();

      // photo file은 onDelete Cascade 적용됨

      if (deleteResult.affected !== 1) {
        throw new Error('Cannot delete the photo.');
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  /**
   * 운영정책 상 photo file은 수정(추가/삭제) 불가
   * 해당 기능이 필요하다면, 사용자는 게시글 삭제하고 사진 다시 선택해서 올려야
   */

  async editPhoto(
    { userId, familyId }: AuthUserId,
    { id, title, payload }: EditPhotoReqDTO,
  ): Promise<BaseResponseDTO> {
    try {
      const updateResult = await this.photoRepository
        .createQueryBuilder('photo')
        .update()
        .where('id = :id', { id })
        .andWhere('author.id = :userId', { userId })
        .andWhere('family.id = :familyId', { familyId })
        .set({ title, payload })
        .updateEntity(false)
        .execute();

      if (updateResult.affected !== 1) {
        throw new Error('Cannot edit the photo.');
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async findPhotos(
    { familyId }: AuthUserId,
    { prev, take }: PaginationReqDTO,
  ): Promise<PhotosResDTO> {
    try {
      const photos = await this.photoRepository
        .createQueryBuilder('photo')
        .select()
        .innerJoinAndSelect('photo.author', 'author')
        .where('photo.familyId = :familyId', { familyId })
        .orderBy('photo.createdAt', 'DESC')
        .addOrderBy('photo.id', 'DESC')
        .offset(prev * take)
        .limit(take)
        .getMany();

      return { result: true, photos };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async findPhoto(
    { userId, familyId }: AuthUserId,
    id: number,
  ): Promise<PhotoResDTO> {
    try {
      const photo = await this.photoRepository
        .createQueryBuilder('photo')
        .select()
        .addSelect('like.id')
        .innerJoinAndSelect('photo.author', 'author')
        .innerJoinAndSelect('photo.files', 'file')
        .leftJoin('photo.likes', 'like', 'like.user.id = :userId', { userId })
        .where('photo.id = :id', { id })
        .andWhere('photo.family.id = :familyId', { familyId })
        .getOneOrFail();

      photo.isLiked = Boolean(photo.likes.length);

      return { result: true, photo };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async likePhoto(
    { userId, familyId }: AuthUserId,
    photoId: number,
  ): Promise<BaseResponseDTO> {
    try {
      const photoExist = await this.photoFamValidate(photoId, familyId);

      if (!photoExist) {
        throw new Error('Cannot like the corresponding photo.');
      }

      const likeExist = await this.likeRepository
        .createQueryBuilder('like')
        .select('like.id')
        .where('like.photo.id = :photoId', { photoId })
        .andWhere('like.user.id = :userId', { userId })
        .getOne();

      if (Boolean(likeExist)) {
        throw new Error('Already liked the photo.');
      }

      await this.likeRepository
        .createQueryBuilder('like')
        .insert()
        .into(PhotoLike)
        .values({ user: { id: userId }, photo: { id: photoId } })
        .updateEntity(false)
        .execute();

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async unlikePhoto(
    { userId }: AuthUserId,
    photoId: number,
  ): Promise<BaseResponseDTO> {
    try {
      const deleteResult = await this.likeRepository
        .createQueryBuilder('like')
        .delete()
        .from(PhotoLike)
        .where('user.id = :userId', { userId })
        .andWhere('photo.id = :photoId', { photoId })
        .execute();

      if (deleteResult.affected !== 1) {
        throw new Error('Cannot delete the like.');
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async commentPhoto(
    { userId, familyId }: AuthUserId,
    { photoId, payload }: CreatePhotoCommentReqDTO,
  ): Promise<CreateResDTO> {
    try {
      const photoExist = await this.photoFamValidate(photoId, familyId);

      if (!photoExist) {
        throw new Error('Cannot comment on the corresponding photo.');
      }

      const insertResult = await this.commentRepository
        .createQueryBuilder('comment')
        .insert()
        .into(PhotoComment)
        .values({ author: { id: userId }, photo: { id: photoId }, payload })
        .updateEntity(false)
        .execute();

      const commentId = insertResult.raw?.insertId;

      // 알림: notification
      const sqsDTO = new SqsNotificationProduceDTO(
        NotificationType.COMMENT_PHOTO,
        { photoId, familyId },
      );

      this.sqsNotificationService.sendNotification(sqsDTO);

      return { result: true, id: commentId };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  /**
   * delete comment에서는 familiy validation 하지 않음
   * 이미 작성된 댓글은 작성한 사용자에게 권한이 귀속
   */
  async deletePhotoComment(
    { userId }: AuthUserId,
    id: number,
  ): Promise<BaseResponseDTO> {
    try {
      const updateResult = await this.commentRepository
        .createQueryBuilder('comment')
        .update()
        .where('id = :id', { id })
        .andWhere('author.id = :userId', { userId })
        .andWhere('status = :status', { status: CommentStatus.ACTIVE })
        .set({ status: CommentStatus.DELETED })
        .execute();

      if (updateResult.affected !== 1) {
        throw new Error(
          'Cannot delete the comment. (Cannot update status to deleted.)',
        );
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async findPhotoComments(
    { familyId }: AuthUserId,
    { photoId, prev, take }: PhotoCommentReqDTO,
  ): Promise<PhotoCommentsResDTO> {
    try {
      const photoExist = await this.photoFamValidate(photoId, familyId);

      if (!photoExist) {
        throw new Error('Cannot access the photo.');
      }

      const comments = await this.commentRepository
        .createQueryBuilder('comment')
        .select()
        .innerJoinAndSelect('comment.author', 'author')
        .where('comment.photo.id = :photoId', { photoId })
        .andWhere('comment.status = :status', { status: CommentStatus.ACTIVE })
        .orderBy('comment.id', 'DESC')
        .offset(take * prev)
        .limit(take)
        .getMany();

      return { result: true, comments };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  /**
   * ResolveField 호출 (findPhotos 필요에 의해 작성)
   * @param photo fileMetadata를 찾을 대상 photo
   * @returns photo와 연관된 file들에 대한 메타데이터 반환 {thumbnailUrl: string, filesCount: number}
   */
  async getFileMetaData(photo: Photo): Promise<PhotoFileMetaDataDTO> {
    try {
      // DataLoder Batch load 적용
      const files = await this.batchPhotoFileLoader.load(photo.id);

      const thumbnailUrl = files[0].url;
      const filesCount = files.length;

      return { thumbnailUrl, filesCount };
    } catch (e) {
      // metadata를 얻을 수 없다고 해서 전체 findPhotos가 동작 실패하지는 않도록 에러 핸들링
      // TODO: front 단에서도, metadata 구하는 중 에러 발생시 metadata 각 필드에 null 들어갈 수 있다는 것 알아야
      console.error(e.message);
      return { thumbnailUrl: null, filesCount: null };
    }
  }

  // repository 분리했다면, Service 바깥으로 빼는 것이 이상적일 듯
  private batchPhotoFileLoader = new DataLoader<number, PhotoFile[]>(
    async (photoIds: readonly number[]) => {
      const files = await this.fileRespository
        .createQueryBuilder('file')
        .select('file.url')
        .addSelect('file.photoId')
        .where('file.photoId IN (:...photoIds)', { photoIds })
        .orderBy('file.id', 'ASC')
        .getMany();

      const fileMap: { [key: number]: PhotoFile[] } = {};

      files.forEach((file) => {
        if (fileMap[file.photoId]) {
          fileMap[file.photoId].push(file);
        } else {
          fileMap[file.photoId] = [file];
        }
      });

      return photoIds.map((photoId) => fileMap[photoId]);
    },
    { cache: false },
  );

  /**
   * ResolveField 호출 (findPhoto 필요성에 의해 작성)
   * @param photo CommentMetadata를 찾을 대상 photo
   * @returns photo와 연관된 comment들에 대한 메타데이터 반환 {commentsCount: number, commentsPreview: Comment[]}
   */
  async getCommentMetaData(photo: Photo): Promise<PhotoCommentMetaDataDTO> {
    try {
      const res: PhotoCommentMetaDataDTO = {
        commentsCount: 0,
        commentsPreview: [],
      };

      const comment = await this.batchPhotoCommentLoader.load(photo.id);

      if (comment) {
        res.commentsCount = comment.length;
        res.commentsPreview = comment.slice(0, 3);
      }

      return res;
    } catch (e) {
      console.error(e.message);
      return { commentsCount: null, commentsPreview: null };
    }
  }

  // 당장은 필요 없지만 api 사용자인 front-end가 필요에 따라 편리하고 유연하게 사용할 수 있도록 하기 위해 구현
  private batchPhotoCommentLoader = new DataLoader<number, PhotoComment[]>(
    async (photoIds: readonly number[]) => {
      const comments = await this.commentRepository
        .createQueryBuilder('comment')
        .select()
        .innerJoinAndSelect('comment.author', 'author')
        .where('comment.photoId IN (:...photoIds)', { photoIds })
        .andWhere('comment.status = :status', { status: CommentStatus.ACTIVE })
        .orderBy('comment.id', 'DESC')
        .getMany();

      const commentMap: { [key: number]: PhotoComment[] } = {};

      comments.forEach((comment) => {
        if (commentMap[comment.photoId]) {
          commentMap[comment.photoId].push(comment);
        } else {
          commentMap[comment.photoId] = [comment];
        }
      });

      return photoIds.map((photoId) => commentMap[photoId]);
    },
    { cache: false },
  );

  /**
   * PhotoId와 FamilyId를 입력 받아, 해당 Photo가 해당 Family의 소유인지 확인
   * @param photoId 확인하고자 하는 Photo의 Id
   * @param familyId 해당 Photo와 매핑된 가족
   */
  async photoFamValidate(photoId: number, familyId: number): Promise<boolean> {
    const exist = await this.photoRepository
      .createQueryBuilder('photo')
      .select('photo.id')
      .where('photo.id = :photoId', { photoId })
      .andWhere('photo.familyId = :familyId', {
        familyId,
      })
      .getOne();

    return Boolean(exist);
  }
}

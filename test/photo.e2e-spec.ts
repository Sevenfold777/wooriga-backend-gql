import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PhotoFile } from 'src/photo/entities/photo-file.entity';
import { Photo } from 'src/photo/entities/photo.entity';
import { MoreThan, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  TEST_FAMILY_ID,
  TEST_FAMILY_USER_ID1,
  TEST_FAMILY_USER_ID2,
  TEST_USER_ID,
} from './utils/config';
import { gqlAuthReq, gqlAuthReqWithVars } from './utils/request';
import { PhotosResDTO } from 'src/photo/dto/photos-res.dto';
import { PhotoResDTO } from 'src/photo/dto/photo-res.dto';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { PhotoLike } from 'src/photo/entities/photo-like.entity';
import { PhotoComment } from 'src/photo/entities/photo-comment.entity';
import { CreateResDTO } from 'src/common/dto/create-res.dto';
import { CommentStatus } from 'src/common/constants/comment-status.enum';
import { PhotoCommentsResDTO } from 'src/photo/dto/photo-comments-res.dto';
import { CreatePhotoResDTO } from 'src/photo/dto/create-photo-res.dto';
import { putObjectS3 } from './utils/putObjectS3';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { LoggingInterceptor } from 'src/common/logging.interceptor';
import { PhotoFileUploaded } from 'src/photo/dto/photo-file-uploaded.dto';

jest.setTimeout(10000);

describe('Photo Module (e2e)', () => {
  let app: INestApplication;

  let photoRepository: Repository<Photo>;
  let fileRepository: Repository<PhotoFile>;
  let likeRepository: Repository<PhotoLike>;
  let commentRepository: Repository<PhotoComment>;

  const photosCreated: { userId: number; photoId: number }[] = [];
  const photofilesCount = 2;
  const photoTitle = 'test title';
  const photoPayload = 'test payload';

  let presignedUrls: string[] = [];
  let presignedTgtPhotoId: number;

  const invalidFamilyMemberId = 7;
  const invalidFamilyId = 7;
  let invalidFamPhotoId: number;

  const commentsCreated: { userId: number; commentId: number }[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    photoRepository = moduleFixture.get('PhotoRepository');
    fileRepository = moduleFixture.get('PhotoFileRepository');
    likeRepository = moduleFixture.get('PhotoLikeRepository');
    commentRepository = moduleFixture.get('PhotoCommentRepository');

    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalInterceptors(new LoggingInterceptor());

    await app.init();

    // init photo entities for test
    const myPhotoInsertResult = await photoRepository.insert({
      title: photoTitle,
      payload: photoPayload,
      family: { id: TEST_FAMILY_ID },
      author: { id: TEST_USER_ID },
      uploaded: true,
    });

    const myPhotoId = myPhotoInsertResult.raw?.insertId;

    photosCreated.push({
      userId: TEST_USER_ID,
      photoId: myPhotoId,
    });

    const famPhotoInsertResult = await photoRepository.insert({
      title: photoTitle,
      payload: photoPayload,
      family: { id: TEST_FAMILY_ID },
      author: { id: TEST_FAMILY_USER_ID1 },
      uploaded: true,
    });

    const famPhotoId = famPhotoInsertResult.raw?.insertId;

    photosCreated.push({
      userId: TEST_FAMILY_USER_ID1,
      photoId: famPhotoId,
    });

    const notFamPhotoInsertResult = await photoRepository.insert({
      title: photoTitle,
      payload: photoPayload,
      family: { id: invalidFamilyId },
      author: { id: invalidFamilyMemberId },
      uploaded: true,
    });

    invalidFamPhotoId = notFamPhotoInsertResult.raw?.insertId;

    const insertValues: QueryDeepPartialEntity<PhotoFile>[] = [];
    for (let i = 0; i < photofilesCount; i++) {
      const myFileInsertValue: QueryDeepPartialEntity<PhotoFile> = {
        url: 'test_url_my' + String(i),
        width: 2000,
        height: 1500,
        photo: { id: myPhotoId },
        uploaded: true,
      };

      const famFileInsertValue: QueryDeepPartialEntity<PhotoFile> = {
        url: 'test_url_fam' + String(i),
        width: 2000,
        height: 1500,
        photo: { id: famPhotoId },
        uploaded: true,
      };

      insertValues.push(myFileInsertValue);
      insertValues.push(famFileInsertValue);
    }

    await fileRepository.insert(insertValues);
  });

  afterAll(async () => {
    // delete entities for test
    await Promise.allSettled([
      ...photosCreated.map((photo) =>
        photoRepository.delete({ id: photo.photoId }),
      ),
      photoRepository.delete({ id: invalidFamPhotoId }),
      commentRepository.delete({ id: MoreThan(0) }),
    ]);

    await app.close();
  });

  it('find photos', () => {
    const query = `
        query { 
            findPhotos {
                result
                error
                photos {
                    id
                    title
                    payload
                    author {
                        id
                        userName
                    }
                    fileMetaData {
                        thumbnailUrl
                        filesCount
                    }
                    
                }
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findPhotos: PhotosResDTO } } }) => {
        const {
          body: {
            data: {
              findPhotos: { result, error, photos },
            },
          },
        } = res;

        expect(result).toBe(true);
        expect(error).toBeNull();

        // beforeAll에서의 insert 순서 기반 (created DESC)
        photosCreated.forEach((p, idx) => {
          const photo = photos[photosCreated.length - 1 - idx];

          expect(photo.id).toBe(p.photoId);
          expect(photo.author.id).toBe(p.userId);

          expect(photo.title).toBe(photoTitle);
          expect(photo.payload).toBe(photoPayload);
          expect(photo.author.userName).not.toBeNull();
          expect(photo.fileMetaData.thumbnailUrl).not.toBeNull();
          expect(photo.fileMetaData.filesCount).toBe(photofilesCount);
        });
      });
  });

  it('find single photo', () => {
    const target = photosCreated[0];

    const query = `
        query { 
            findPhoto(id: ${target.photoId}) {
                result
                error
                photo {
                    id
                    author {
                        id
                        userName
                    }
                    title
                    payload
                    isLiked
                    commentMetaData {
                        commentsCount
                        commentsPreview {
                            id
                            author {
                                id
                                userName
                            }
                            payload
                        }
                    }
                }
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findPhoto: PhotoResDTO } } }) => {
        const {
          body: {
            data: {
              findPhoto: { result, error, photo },
            },
          },
        } = res;

        expect(result).toBe(true);
        expect(error).toBeNull();

        expect(photo.id).toBe(target.photoId);
        expect(photo.author.id).toBe(target.userId);
        expect(photo.title).toBe(photoTitle);
        expect(photo.payload).toBe(photoPayload);
        expect(photo.isLiked).toBe(false);

        expect(photo.commentMetaData.commentsCount).toBe(0);
        expect(photo.commentMetaData.commentsPreview.length).toBe(0);
      });
  });

  it('우리 가족 아닌 find single photo error', () => {
    const query = `
        query { 
            findPhoto(id: ${invalidFamPhotoId}) {
                result
                error
                photo {
                    id
                }
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findPhoto: PhotoResDTO } } }) => {
        const {
          body: {
            data: {
              findPhoto: { result, error, photo },
            },
          },
        } = res;

        expect(result).toBe(false);
        expect(error).not.toBeNull();
        expect(photo).toBeNull();
      });
  });

  // 아래 like test 간 순서 중요 (like 성공 -> findPhoto like 확인 -> 중복 like 에러)
  it('like photo', async () => {
    const target = photosCreated[0];

    const query = `
        mutation {
            likePhoto(photoId: ${target.photoId}) {
                result
                error
            }
        }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { likePhoto: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              likePhoto: { result, error },
            },
          },
        } = res;

        expect(result).toBe(true);
        expect(error).toBeNull();
      });

    const likeCreated = await likeRepository.findOne({
      where: { photo: { id: target.photoId }, user: { id: TEST_USER_ID } },
    });

    expect(likeCreated).not.toBeNull();
  });

  it('findPhoto isLiked === true 확인', () => {
    const target = photosCreated[0];

    const query = `
        query { 
            findPhoto(id: ${target.photoId}) {
                result
                error
                photo {
                    id
                    author {
                        id
                        userName
                    }
                    title
                    payload
                    isLiked
                    commentMetaData {
                        commentsCount
                        commentsPreview {
                            id
                            author {
                                id
                                userName
                            }
                            payload
                        }
                    }
                }
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findPhoto: PhotoResDTO } } }) => {
        const {
          body: {
            data: {
              findPhoto: { result, error, photo },
            },
          },
        } = res;
        expect(photo.isLiked).toBe(true);

        // 이하 find photo 성공 테스트와 동일
        expect(result).toBe(true);
        expect(error).toBeNull();

        expect(photo.id).toBe(target.photoId);
        expect(photo.author.id).toBe(target.userId);
        expect(photo.title).toBe(photoTitle);
        expect(photo.payload).toBe(photoPayload);

        expect(photo.commentMetaData.commentsCount).toBe(0);
        expect(photo.commentMetaData.commentsPreview.length).toBe(0);
      });
  });

  it('중복 like photo', () => {
    const target = photosCreated[0];

    const query = `
        mutation {
            likePhoto(photoId: ${target.photoId}) {
                result
                error
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { likePhoto: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              likePhoto: { result, error },
            },
          },
        } = res;

        expect(result).toBe(false);
        expect(error).toBe('Already liked the photo.');
      });
  });

  it('우리 가족 아닌 like photo', () => {
    const query = `
        mutation {
            likePhoto(photoId: ${invalidFamPhotoId}) {
                result
                error
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { likePhoto: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              likePhoto: { result, error },
            },
          },
        } = res;

        expect(result).toBe(false);
        expect(error).toBe('Cannot like the corresponding photo.');
      });
  });

  it('unlike photo', async () => {
    const target = photosCreated[0];

    const query = `
        mutation {
            unlikePhoto(photoId: ${target.photoId}) {
                result
                error
            }
        }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { unlikePhoto: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              unlikePhoto: { result, error },
            },
          },
        } = res;

        expect(result).toBe(true);
        expect(error).toBeNull();
      });

    const likeDeleted = await likeRepository.findOne({
      where: { photo: { id: target.photoId }, user: { id: TEST_USER_ID } },
    });

    expect(likeDeleted).toBeNull();
  });

  it('중복 unlike photo', () => {
    const target = photosCreated[0];

    const query = `
        mutation {
            unlikePhoto(photoId: ${target.photoId}) {
                result
                error
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { unlikePhoto: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              unlikePhoto: { result, error },
            },
          },
        } = res;

        expect(result).toBe(false);
        expect(error).toBe('Cannot delete the like.');
      });
  });

  // 아래의 comment 순서 유의 (comment -> findPhoto -> find photo comments)
  it('create comment photo', async () => {
    const testPayload = 'comment test payload.';
    const target = photosCreated[0];
    let commentCreatedId: number;

    const query = `
        mutation {
            commentPhoto(photoId: ${target.photoId}, payload: "${testPayload}") {
                result
                error
                id
            }
        }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { commentPhoto: CreateResDTO } } }) => {
        const {
          body: {
            data: {
              commentPhoto: { result, error, id },
            },
          },
        } = res;

        expect(result).toBe(true);
        expect(error).toBeNull();
        expect(id).toBeGreaterThanOrEqual(1);

        commentCreatedId = id;
        commentsCreated.push({ commentId: id, userId: TEST_USER_ID });
      });

    const commentCreated = await commentRepository.findOne({
      where: { id: commentCreatedId },
    });

    expect(commentCreated.id).toBe(commentCreatedId);
    expect(commentCreated.authorId).toBe(TEST_USER_ID);
    expect(commentCreated.payload).toBe(testPayload);
    expect(commentCreated.photoId).toBe(target.photoId);
    expect(commentCreated.status).toBe(CommentStatus.ACTIVE);
  });

  it('find photo - comment Metadata 테스트', async () => {
    const testPayload = 'comment test payload.';
    const target = photosCreated[0];

    const result1 = await commentRepository.insert({
      photo: { id: target.photoId },
      author: { id: TEST_FAMILY_USER_ID1 },
      payload: testPayload,
    });

    commentsCreated.push({
      userId: TEST_FAMILY_USER_ID1,
      commentId: result1.raw?.insertId,
    });

    const result2 = await commentRepository.insert({
      photo: { id: target.photoId },
      author: { id: TEST_FAMILY_USER_ID2 },
      payload: testPayload,
    });

    commentsCreated.push({
      userId: TEST_FAMILY_USER_ID2,
      commentId: result2.raw?.insertId,
    });

    const result3 = await commentRepository.insert({
      photo: { id: target.photoId },
      author: { id: TEST_USER_ID },
      payload: testPayload,
    });

    commentsCreated.push({
      userId: TEST_USER_ID,
      commentId: result3.raw?.insertId,
    });

    const query = `
        query { 
            findPhoto(id: ${target.photoId}) {
                result
                error
                photo {
                    id
                    author {
                        id
                        userName
                    }
                    title
                    payload
                    isLiked
                    commentMetaData {
                        commentsCount
                        commentsPreview {
                            id
                            author {
                                id
                                userName
                            }
                            photoId
                            payload
                        }
                    }
                }
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findPhoto: PhotoResDTO } } }) => {
        const {
          body: {
            data: {
              findPhoto: { result, error, photo },
            },
          },
        } = res;

        expect(photo.commentMetaData.commentsCount).toBe(
          commentsCreated.length,
        );
        photo.commentMetaData.commentsPreview.forEach((comment, idx) => {
          const expectedComment =
            commentsCreated[commentsCreated.length - 1 - idx];

          expect(comment.id).toBe(expectedComment.commentId);
          expect(comment.author.id).toBe(expectedComment.userId);
          expect(comment.photoId).toBe(target.photoId);
          expect(comment.payload).toBe(testPayload);
        });

        // 이하 find photo 성공 테스트와 동일
        expect(result).toBe(true);
        expect(error).toBeNull();

        expect(photo.id).toBe(target.photoId);
        expect(photo.author.id).toBe(target.userId);
        expect(photo.title).toBe(photoTitle);
        expect(photo.payload).toBe(photoPayload);
        expect(photo.isLiked).toBe(false);
      });
  });

  it('find photo comments - all', () => {
    const target = photosCreated[0];

    const query = `
        query {
            findPhotoComments(photoId: ${target.photoId}) {
                result
                error
                comments {
                    id
                    payload
                    author {
                        id
                        userName
                    }
                    createdAt
                    photoId
                }
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: {
          body: { data: { findPhotoComments: PhotoCommentsResDTO } };
        }) => {
          const {
            body: {
              data: {
                findPhotoComments: { result, error, comments },
              },
            },
          } = res;

          expect(result).toBe(true);
          expect(error).toBeNull();

          expect(comments.length).toBe(commentsCreated.length);
          comments.forEach((comment, idx) => {
            const expectedComment =
              commentsCreated[commentsCreated.length - 1 - idx];

            expect(comment.id).toBe(expectedComment.commentId);
            expect(comment.author.id).toBe(expectedComment.userId);
            expect(comment.author.userName).not.toBe(null);
            expect(comment.payload).not.toBeNull();
            expect(comment.createdAt).not.toBeNull();
            expect(comment.photoId).toBe(target.photoId);
          });
        },
      );
  });

  it('find photo comments - pagination', () => {
    const target = photosCreated[0];
    const prev = 1;
    const take = 2;

    const query = `
        query {
            findPhotoComments(photoId: ${target.photoId}, prev: ${prev}, take: ${take}) {
                result
                error
                comments {
                    id
                    payload
                    author {
                        id
                        userName
                    }
                    createdAt
                    photoId
                }
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: {
          body: { data: { findPhotoComments: PhotoCommentsResDTO } };
        }) => {
          const {
            body: {
              data: {
                findPhotoComments: { result, error, comments },
              },
            },
          } = res;

          expect(result).toBe(true);
          expect(error).toBeNull();

          expect(comments.length).toBe(take);
          comments.forEach((comment, idx) => {
            const expectedComment =
              commentsCreated[commentsCreated.length - 1 - take * prev - idx];

            expect(comment.id).toBe(expectedComment.commentId);
            expect(comment.author.id).toBe(expectedComment.userId);
            expect(comment.author.userName).not.toBe(null);
            expect(comment.payload).not.toBeNull();
            expect(comment.createdAt).not.toBeNull();
            expect(comment.photoId).toBe(target.photoId);
          });
        },
      );
  });

  it('우리 가족 아닌 find photo comments', () => {
    const query = `
        query {
            findPhotoComments(photoId: ${invalidFamPhotoId}) {
                result
                error
                comments {
                    id
                    payload
                    author {
                        id
                        userName
                    }
                    createdAt
                    photoId
                }
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: {
          body: { data: { findPhotoComments: PhotoCommentsResDTO } };
        }) => {
          const {
            body: {
              data: {
                findPhotoComments: { result, error, comments },
              },
            },
          } = res;

          expect(result).toBe(false);
          expect(error).toBe('Cannot access the photo.');
          expect(comments).toBe(null);
        },
      );
  });

  it('우리 가족 아닌 photo create comment error', () => {
    const testPayload = 'test payload.';

    const query = `
        mutation {
            commentPhoto(photoId: ${invalidFamPhotoId}, payload: "${testPayload}") {
                result
                error
                id
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { commentPhoto: CreateResDTO } } }) => {
        const {
          body: {
            data: {
              commentPhoto: { result, error, id },
            },
          },
        } = res;

        expect(result).toBe(false);
        expect(error).toBe('Cannot comment on the corresponding photo.');
        expect(id).toBeNull();
      });
  });

  // 가장 마지막에 추가된 comment의 author = TEST_USER_ID
  it('delete comment', async () => {
    const target = commentsCreated.pop();

    const query = `
        mutation {
            deletePhotoComment(id: ${target.commentId}) {
                result
                error
            }
        }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: { body: { data: { deletePhotoComment: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                deletePhotoComment: { result, error },
              },
            },
          } = res;

          expect(result).toBe(true);
          expect(error).toBeNull();
        },
      );

    const commentDeleted = await commentRepository.findOne({
      where: { id: target.commentId },
    });

    expect(commentDeleted.status).toBe(CommentStatus.DELETED);
  });

  // 뒤에서 두 번째 추가된 comment의 author = TEST_FAMILY_USER_ID2
  it('본인 소유 아닌 comment delete 에러', () => {
    const target = commentsCreated[commentsCreated.length - 1];

    const query = `
        mutation {
            deletePhotoComment(id: ${target.commentId}) {
                result
                error
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: { body: { data: { deletePhotoComment: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                deletePhotoComment: { result, error },
              },
            },
          } = res;

          expect(result).toBe(false);
          expect(error).toBe(
            'Cannot delete the comment. (Cannot update status to deleted.)',
          );
        },
      );
  });

  // find single photo와 거의 동일 => 함수 등으로 반복 피하기 고려
  it('find photo (comments metadata) - delete 결과 반영 확인', () => {
    const target = photosCreated[0];

    const query = `
        query { 
            findPhoto(id: ${target.photoId}) {
                result
                error
                photo {
                    id
                    author {
                        id
                        userName
                    }
                    title
                    payload
                    isLiked
                    commentMetaData {
                        commentsCount
                        commentsPreview {
                            id
                            author {
                                id
                                userName
                            }
                            payload
                        }
                    }
                }
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findPhoto: PhotoResDTO } } }) => {
        const {
          body: {
            data: {
              findPhoto: { result, error, photo },
            },
          },
        } = res;

        expect(result).toBe(true);
        expect(error).toBeNull();

        expect(photo.id).toBe(target.photoId);
        expect(photo.author.id).toBe(target.userId);
        expect(photo.title).toBe(photoTitle);
        expect(photo.payload).toBe(photoPayload);
        expect(photo.isLiked).toBe(false);

        expect(photo.commentMetaData.commentsCount).toBe(
          commentsCreated.length,
        );
        expect(photo.commentMetaData.commentsPreview.length).toBe(
          commentsCreated.length > 3 ? 3 : commentsCreated.length,
        );
      });
  });

  // find photo comments - all와 거의 동일 => 함수 등으로 반복 피하기 고려
  it('find photo comments - delete 결과 반영 확인', () => {
    const target = photosCreated[0];

    const query = `
        query {
            findPhotoComments(photoId: ${target.photoId}) {
                result
                error
                comments {
                    id
                    payload
                    author {
                        id
                        userName
                    }
                    createdAt
                    photoId
                }
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: {
          body: { data: { findPhotoComments: PhotoCommentsResDTO } };
        }) => {
          const {
            body: {
              data: {
                findPhotoComments: { result, error, comments },
              },
            },
          } = res;

          expect(result).toBe(true);
          expect(error).toBeNull();

          expect(comments.length).toBe(commentsCreated.length);
          comments.forEach((comment, idx) => {
            const expectedComment =
              commentsCreated[commentsCreated.length - 1 - idx];

            expect(comment.id).toBe(expectedComment.commentId);
            expect(comment.author.id).toBe(expectedComment.userId);
            expect(comment.author.userName).not.toBe(null);
            expect(comment.payload).not.toBeNull();
            expect(comment.createdAt).not.toBeNull();
            expect(comment.photoId).toBe(target.photoId);
          });
        },
      );
  });

  it('edit photo', async () => {
    const target = photosCreated[0];
    const titleToUpdate = 'title edit done.';
    const payloadToUpdate = 'payload edit done.';

    const query = `
        mutation {
            editPhoto(id: ${target.photoId}, title: "${titleToUpdate}", payload: "${payloadToUpdate}") {
                result
                error
            }
        }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { editPhoto: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              editPhoto: { result, error },
            },
          },
        } = res;

        expect(result).toBe(true);
        expect(error).toBeNull();
      });

    const photoUpdated = await photoRepository.findOne({
      where: { id: target.photoId },
    });

    expect(photoUpdated.title).toBe(titleToUpdate);
    expect(photoUpdated.payload).toBe(payloadToUpdate);
  });

  it('delete photo', async () => {
    const target = photosCreated[0];

    const query = `
        mutation {
            deletePhoto(id: ${target.photoId}) {
                result
                error
            }
        }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { deletePhoto: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              deletePhoto: { result, error },
            },
          },
        } = res;

        expect(result).toBe(true);
        expect(error).toBeNull();
      });

    const photoDeleted = await photoRepository.findOne({
      where: { id: target.photoId },
    });

    expect(photoDeleted).toBeNull();
    photosCreated.shift(); // shift array to left === 첫 번째 원소 삭제
  });

  it('본인 소유 아닌 photo edit error', () => {
    const target = photosCreated[0]; // 위에서 진행한 shift 연산으로 인해 본인 소유 아닌 photo로 변환
    const titleToUpdate = 'title edit done.';
    const payloadToUpdate = 'payload edit done.';

    const query = `
        mutation {
            editPhoto(id: ${target.photoId}, title: "${titleToUpdate}", payload: "${payloadToUpdate}") {
                result
                error
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { editPhoto: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              editPhoto: { result, error },
            },
          },
        } = res;

        expect(result).toBe(false);
        expect(error).toBe('Cannot edit the photo.');
      });
  });

  it('본인 소유 아닌 photo delete error', () => {
    const target = photosCreated[0];

    const query = `
        mutation {
            deletePhoto(id: ${target.photoId}) {
                result
                error
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { deletePhoto: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              deletePhoto: { result, error },
            },
          },
        } = res;

        expect(result).toBe(false);
        expect(error).toBe('Cannot delete the photo.');
      });
  });

  it('우리 가족 아닌 photo edit error', () => {
    const titleToUpdate = 'title edit done.';
    const payloadToUpdate = 'payload edit done.';

    const query = `
        mutation {
            editPhoto(id: ${invalidFamPhotoId}, title: "${titleToUpdate}", payload: "${payloadToUpdate}") {
                result
                error
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { editPhoto: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              editPhoto: { result, error },
            },
          },
        } = res;

        expect(result).toBe(false);
        expect(error).toBe('Cannot edit the photo.');
      });
  });

  it('우리 가족 아닌 photo delete error', () => {
    const query = `
        mutation {
            deletePhoto(id: ${invalidFamPhotoId}) {
                result
                error
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { deletePhoto: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              deletePhoto: { result, error },
            },
          },
        } = res;

        expect(result).toBe(false);
        expect(error).toBe('Cannot delete the photo.');
      });
  });

  // e2e test for photo creation

  // 1. create photo
  it('create photo', async () => {
    // given
    const testFilesCount = 3;

    // when
    const query = `
      mutation {
        createPhoto(title: "${photoTitle}", payload: "${photoPayload}", filesCount: ${testFilesCount}) {
          result
          error
          photoId
          presignedUrls
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { createPhoto: CreatePhotoResDTO } } }) => {
        const {
          body: {
            data: {
              createPhoto: {
                result,
                error,
                presignedUrls: returnedUrls,
                photoId,
              },
            },
          },
        } = res;

        expect(result).toBe(true);
        expect(error).toBeNull();
        expect(returnedUrls.length).toBe(testFilesCount);

        presignedTgtPhotoId = photoId;
        presignedUrls = returnedUrls;
      });

    // then
    const photo = await photoRepository.findOne({
      where: { id: presignedTgtPhotoId },
      relations: { files: true },
    });

    expect(photo.familyId).toBe(TEST_FAMILY_ID);
    expect(photo.files.length).toBe(testFilesCount);

    photo.files.sort((a, b) => a.id - b.id);
    presignedUrls.forEach((url, idx) => {
      const strippedUrl = url
        .replace(/^(https?:\/\/[^\/]+\.com\/)/, '')
        .split('?')[0];
      expect(photo.files[idx].url).toBe(strippedUrl);
    });

    // // 뒷 정리
    // const deleteResult = await photoRepository.delete({ id: photo[0].id });
    // expect(deleteResult.affected).toBe(1);
  });

  // 2. file upload completed
  it('upload photo completed', async () => {
    // given
    // 위 create photo 테스트에서 생성된 presignedUrls
    const testFilePath = path.join(__dirname, 'utils', 'test-image.jpeg');
    const testFile = fs.readFileSync(testFilePath);

    const testWidth = 800;
    const testHeight = 400;

    const strippedUrls = presignedUrls.map(
      (url) => url.replace(/^(https?:\/\/[^\/]+\.com\/)/, '').split('?')[0],
    );

    await Promise.all(presignedUrls.map((url) => putObjectS3(url, testFile)));

    // when
    const filesUploadedVar: PhotoFileUploaded[] = strippedUrls.map((url) => ({
      width: testWidth,
      height: testHeight,
      url,
    }));

    const variables = {
      id: presignedTgtPhotoId,
      filesUploadedVar,
    };

    const query = `
      mutation fileUploadedMuation($id: Int!, $filesUploadedVar: [PhotoFileUploaded!]!) {
        fileUploadCompleted(photoId: $id, photofilesUploaded: $filesUploadedVar) {
          result
          error
        }
      }
    `;

    await gqlAuthReqWithVars(app, query, variables)
      .expect(200)
      .expect(
        (res: { body: { data: { fileUploadCompleted: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                fileUploadCompleted: { result, error },
              },
            },
          } = res;

          expect(result).toBe(true);
          expect(error).toBeNull();
        },
      );

    // then
    const photo = await photoRepository.findOne({
      where: { id: presignedTgtPhotoId },
      relations: { files: true },
    });

    expect(photo.familyId).toBe(TEST_FAMILY_ID);
    expect(photo.files.length).toBe(presignedUrls.length);
    expect(photo.uploaded).toBe(true);

    photo.files.sort((a, b) => a.id - b.id);
    strippedUrls.forEach((url, idx) => {
      expect(photo.files[idx].url).toBe(url);
      expect(photo.files[idx].uploaded).toBe(true);
      expect(photo.files[idx].width).toBe(testWidth);
      expect(photo.files[idx].height).toBe(testHeight);
    });
  });

  // 3. delete photo
  it('delete photo', async () => {
    // given
    // 위 create photo 테스트에서 생성된 presignedUrls
    // 위 upload photo completed에서 s3에 올린 파일

    // when
    const query = `
      mutation {
        deletePhoto(id: ${presignedTgtPhotoId}) {
          result
          error
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { deletePhoto: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              deletePhoto: { result, error },
            },
          },
        } = res;

        expect(result).toBe(true);
        expect(error).toBeNull();
      });

    // then
    const photo = await photoRepository.findOne({
      where: { id: presignedTgtPhotoId },
    });
    expect(photo).toBeNull();

    const files = await fileRepository.find({
      where: { photo: { id: presignedTgtPhotoId } },
    });
    expect(files.length).toBe(0);

    for (const url of presignedUrls) {
      const targetUrl = url.split('?')[0];

      axios.get(targetUrl).catch((err) => {
        expect(err.response.status).toBe(403);
      });
    }
  });
});

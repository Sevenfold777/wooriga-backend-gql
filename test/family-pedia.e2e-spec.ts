import { CreateProfilePhotoResDTO } from './../src/family-pedia/dto/create-profile-photo-res.dto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { gqlAuthReq } from './utils/request';
import { FamilyPediasResDTO } from 'src/family-pedia/dto/family-pedias-res.dto';
import {
  TEST_FAMILY_ID,
  TEST_FAMILY_USER_ID1,
  TEST_FAMILY_USER_ID2,
  TEST_USER_ID,
} from './utils/config';
import { FamilyPediaResDTO } from 'src/family-pedia/dto/family-pedia-res.dto';
import { CreateResDTO } from 'src/common/dto/create-res.dto';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { Repository } from 'typeorm';
import { FamilyPediaQuestion } from 'src/family-pedia/entities/family-pedia-question';
import { LoggingInterceptor } from 'src/common/logging.interceptor';
import { ProfilePhotosResDTO } from 'src/family-pedia/dto/profile-photos-res.dto';
import { FamilyPediaProfilePhoto } from 'src/family-pedia/entities/family-pedia-profile-photo.entity';
import { putObjectS3 } from './utils/putObjectS3';
import * as path from 'path';
import * as fs from 'fs';
import { FamilyPedia } from 'src/family-pedia/entities/family-pedia.entity';
import axios from 'axios';

jest.setTimeout(10000);

describe('Family Pedia Module (e2e)', () => {
  let app: INestApplication;
  const invalidFamilyMemberId = 7;
  let createdQuestionId: number;

  let pediaRepository: Repository<FamilyPedia>;
  let questionRepository: Repository<FamilyPediaQuestion>;
  let profilePhotoRepository: Repository<FamilyPediaProfilePhoto>;

  let presignedUrl: string;
  let createProfilePhotoId: number;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    pediaRepository = moduleFixture.get('FamilyPediaRepository');
    questionRepository = moduleFixture.get('FamilyPediaQuestionRepository');
    profilePhotoRepository = moduleFixture.get(
      'FamilyPediaProfilePhotoRepository',
    );

    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalInterceptors(new LoggingInterceptor());

    await app.init();
  });

  afterAll(async () => {
    try {
      await questionRepository.delete({ id: createdQuestionId });
      // await pediaRepository.update(
      //   { ownerId: TEST_USER_ID },
      //   { profilePhoto: process.env.FAMILY_PEDIA_DEFAULT_IMG },
      // );
    } catch (e) {
      console.error(e.message);
    } finally {
      await app.close();
    }
  });

  it('find pedias', () => {
    const query = `
        query {
            findPedias {
                result
                error
                familyPedias {
                    ownerId
                    owner {
                        id
                        userName
                        familyId
                    }
                    profilePhoto
                }
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findPedias: FamilyPediasResDTO } } }) => {
        const {
          body: {
            data: {
              findPedias: { result, error, familyPedias },
            },
          },
        } = res;

        expect(result).toBe(true);
        expect(error).toBeNull();
        familyPedias.forEach((pedia) =>
          expect(pedia.owner.familyId).toBe(TEST_FAMILY_ID),
        );
        expect(familyPedias[0].owner.id).toBe(TEST_USER_ID);
        expect(familyPedias.length).toBe(3);
      });
  });

  it('find single pedia', () => {
    const query = `
        query {
            findPedia(id: ${TEST_USER_ID}) {
                result
                error
                familyPedia {
                    ownerId
                    owner {
                        id
                        userName
                    }
                    questions {
                        id
                        question
                        answer
                    }
                    
                }
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findPedia: FamilyPediaResDTO } } }) => {
        const {
          body: {
            data: {
              findPedia: { result, error, familyPedia },
            },
          },
        } = res;

        expect(result).toBe(true);
        expect(error).toBeNull();
        expect(familyPedia.ownerId).toBe(TEST_USER_ID);
        expect(familyPedia.questions).not.toBeNull();

        if (familyPedia.questions.length > 0) {
          familyPedia.questions.forEach((q) => {
            expect(q.question).not.toBe('');
          });
        }
      });
  });

  it('가족 아닌 find single pedia 에러', () => {
    const query = `
        query {
            findPedia(id: ${invalidFamilyMemberId}) {
                result
                error
                familyPedia {
                    ownerId
                    owner {
                        id
                        userName
                    }
                    questions {
                        id
                        question
                        answer
                    }
                    
                }
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findPedia: FamilyPediaResDTO } } }) => {
        const {
          body: {
            data: {
              findPedia: { result, error, familyPedia },
            },
          },
        } = res;

        expect(result).toBe(false);
        expect(error).not.toBeNull();
        expect(familyPedia).toBeNull();
      });
  });

  it('create question', () => {
    const questionPayload = '이것은 question 생성 테스트용 payload 입니다.';

    const query = `
        mutation {
            createQuestion(pediaId: ${TEST_USER_ID}, question: "${questionPayload}") {
                result
                error
                id
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { createQuestion: CreateResDTO } } }) => {
        const {
          body: {
            data: {
              createQuestion: { result, error, id },
            },
          },
        } = res;

        createdQuestionId = id;

        expect(result).toBe(true);
        expect(error).toBeNull();
        expect(id).toBeGreaterThan(0);
      });
  });

  it('가족 아닌 create question 에러', () => {
    const questionPayload = '이것은 question 실패할 테스트용 payload 입니다.';

    const query = `
        mutation {
            createQuestion(pediaId: ${invalidFamilyMemberId}, question: "${questionPayload}") {
                result
                error
                id
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { createQuestion: CreateResDTO } } }) => {
        const {
          body: {
            data: {
              createQuestion: { result, error, id },
            },
          },
        } = res;

        expect(result).toBe(false);
        expect(error).toBe('Cannot add question to the pedia.');
        expect(id).toBeNull();
      });
  });

  it('edit question', () => {
    const editQuestionPayload = 'this is a payload for question edit.';

    const query = `
        mutation {
            editQuestion(id: ${createdQuestionId}, pediaId: ${TEST_USER_ID}, question: "${editQuestionPayload}") {
                result
                error
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect(
        async (res: { body: { data: { editQuestion: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                editQuestion: { result, error },
              },
            },
          } = res;

          expect(result).toBe(true);
          expect(error).toBeNull();

          const edittedQuestion = await questionRepository.findOne({
            where: { id: createdQuestionId },
          });

          expect(edittedQuestion.question).toBe(editQuestionPayload);
        },
      );
  });

  it('내가 하지 않은 질문 edit question 에러', async () => {
    const inserted = await questionRepository.insert({
      question: 'test question',
      questioner: { id: TEST_FAMILY_USER_ID2 },
      familyPedia: { owner: { id: TEST_FAMILY_USER_ID1 } },
    });

    const newQuestionId = inserted.raw.insertId;

    const editQuestionPayload = 'this is a payload for question edit.';

    const query = `
        mutation {
            editQuestion(id: ${newQuestionId}, pediaId: ${TEST_FAMILY_USER_ID1}, question: "${editQuestionPayload}") {
                result
                error
            }
        }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        async (res: { body: { data: { editQuestion: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                editQuestion: { result, error },
              },
            },
          } = res;

          expect(result).toBe(false);
          expect(error).toBe('Cannot modify the question.');
        },
      );

    await questionRepository.delete({ id: newQuestionId });
  });

  it('우리 가족 아닌 pedia에 edit question 에러', () => {
    const editQuestionPayload = 'this is a payload for question edit.';

    const query = `
        mutation {
            editQuestion(id: ${createdQuestionId}, pediaId: ${invalidFamilyMemberId}, question: "${editQuestionPayload}") {
                result
                error
            }
        }
    `;

    return gqlAuthReq(app, query)
      .expect(200)
      .expect(
        async (res: { body: { data: { editQuestion: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                editQuestion: { result, error },
              },
            },
          } = res;

          expect(result).toBe(false);
          expect(error).toBe('Cannot edit the question in the pedia.');
        },
      );
  });

  it('answer question', async () => {
    const answerPayload = 'this is a test answer payload.';

    const query = `
        mutation {
            answerQuestion(id: ${createdQuestionId}, answer: "${answerPayload}") {
                result
                error
            }
        }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: { body: { data: { answerQuestion: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                answerQuestion: { result, error },
              },
            },
          } = res;

          expect(result).toBe(true);
          expect(error).toBeNull();
        },
      );

    const question = await questionRepository.findOne({
      where: { id: createdQuestionId },
    });

    expect(question.answer).toBe(answerPayload);
  });

  it('answer question - pedia 소유자 아닌 경우 에러', async () => {
    const insertResult = await questionRepository.insert({
      question: 'question for test',
      questioner: { id: TEST_USER_ID },
      familyPedia: { owner: { id: TEST_FAMILY_USER_ID1 } },
    });

    const newQuestionId = insertResult.raw.insertId;

    const answerPayload = 'this is a test answer payload.';

    const query = `
        mutation {
            answerQuestion(id: ${newQuestionId}, answer: "${answerPayload}") {
                result
                error
            }
        }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: { body: { data: { answerQuestion: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                answerQuestion: { result, error },
              },
            },
          } = res;

          expect(result).toBe(false);
          expect(error).toBe('Cannot find the pedia with permission.');
        },
      );

    await questionRepository.delete({ id: newQuestionId });
  });

  // delete question - query buidler 사용한 동적 쿼리
  it('delete question - 답장 안한 경우, question 질문자 삭제 가능', async () => {
    const insertResult = await questionRepository.insert({
      question: 'test question',
      questioner: { id: TEST_USER_ID },
      familyPedia: { owner: { id: TEST_FAMILY_USER_ID1 } },
    });
    const newQuestionId = insertResult.raw.insertId;

    const query = `
        mutation {
            deleteQuestion(id: ${newQuestionId}) {
                result
                error
            }
        }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: { body: { data: { deleteQuestion: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                deleteQuestion: { result, error },
              },
            },
          } = res;

          expect(result).toBe(true);
          expect(error).toBeNull();
        },
      );

    const questionDeleted = await questionRepository.findOne({
      where: { id: newQuestionId },
    });

    expect(questionDeleted).toBeNull();
  });

  it('delete question - 답장 안한 경우, pedia 소유자 삭제 가능', async () => {
    const insertResult = await questionRepository.insert({
      question: 'test question',
      questioner: { id: TEST_FAMILY_USER_ID1 },
      familyPedia: { owner: { id: TEST_USER_ID } },
    });
    const newQuestionId = insertResult.raw.insertId;

    const query = `
        mutation {
            deleteQuestion(id: ${newQuestionId}) {
                result
                error
            }
        }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: { body: { data: { deleteQuestion: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                deleteQuestion: { result, error },
              },
            },
          } = res;

          expect(result).toBe(true);
          expect(error).toBeNull();
        },
      );

    const questionDeleted = await questionRepository.findOne({
      where: { id: newQuestionId },
    });

    expect(questionDeleted).toBeNull();
  });

  it('delete question - 답장 완료 경우, question 질문자 삭제 불가능 에러', async () => {
    const insertResult = await questionRepository.insert({
      question: 'test question',
      questioner: { id: TEST_USER_ID },
      familyPedia: { owner: { id: TEST_FAMILY_USER_ID1 } },
      answer: 'test answer',
    });
    const newQuestionId = insertResult.raw.insertId;

    const query = `
        mutation {
            deleteQuestion(id: ${newQuestionId}) {
                result
                error
            }
        }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: { body: { data: { deleteQuestion: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                deleteQuestion: { result, error },
              },
            },
          } = res;

          expect(result).toBe(false);
          expect(error).toBe('Cannot delete the question due to permission.');
        },
      );

    await questionRepository.delete({ id: newQuestionId });
  });

  it('delete question - 답장 완료 경우, pedia 소유자 삭제 가능', async () => {
    const insertResult = await questionRepository.insert({
      question: 'test question',
      questioner: { id: TEST_FAMILY_USER_ID1 },
      familyPedia: { owner: { id: TEST_USER_ID } },
      answer: 'test answer',
    });
    const newQuestionId = insertResult.raw.insertId;

    const query = `
        mutation {
            deleteQuestion(id: ${newQuestionId}) {
                result
                error
            }
        }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: { body: { data: { deleteQuestion: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                deleteQuestion: { result, error },
              },
            },
          } = res;

          expect(result).toBe(true);
          expect(error).toBeNull();
        },
      );

    const questionDeleted = await questionRepository.findOne({
      where: { id: newQuestionId },
    });

    expect(questionDeleted).toBeNull();
  });

  it('delete question - 같은 가족이지만 question 질문자나 pedia 소유자가 아닌 경우 에러', async () => {
    const insertResult = await questionRepository.insert({
      question: 'test question',
      questioner: { id: TEST_FAMILY_USER_ID2 },
      familyPedia: { owner: { id: TEST_FAMILY_USER_ID1 } },
    });
    const newQuestionId = insertResult.raw.insertId;

    const query = `
        mutation {
            deleteQuestion(id: ${newQuestionId}) {
                result
                error
            }
        }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: { body: { data: { deleteQuestion: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                deleteQuestion: { result, error },
              },
            },
          } = res;

          expect(result).toBe(false);
          expect(error).toBe('Cannot delete the question due to permission.');
        },
      );

    await questionRepository.delete({ id: newQuestionId });
  });

  it('delete question - pedia 접근 가능한 가족이 아닌 경우 에러', async () => {
    const insertResult = await questionRepository.insert({
      question: 'test question',
      questioner: { id: invalidFamilyMemberId },
      familyPedia: { owner: { id: invalidFamilyMemberId } },
    });
    const newQuestionId = insertResult.raw.insertId;

    const query = `
        mutation {
            deleteQuestion(id: ${newQuestionId}) {
                result
                error
            }
        }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: { body: { data: { deleteQuestion: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                deleteQuestion: { result, error },
              },
            },
          } = res;

          expect(result).toBe(false);
          expect(error).toBe(
            'Cannot access to the pedia related to the question.',
          );
        },
      );

    await questionRepository.delete({ id: newQuestionId });
  });

  // e2e test for profile photo edit

  // 1. 등록된 photo 없으면 default photo 추가해서 리턴
  it('no photo uploaded, return default photo', async () => {
    // given
    // pedia.ownerId = TEST_USER_ID already exists in test db

    // when
    const query = `
      query {
	      findPediaProfilePhotos(pediaId: ${TEST_USER_ID}) {
          result
          error
          profilePhotos {
            id
            url
            width
            height
          }
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: {
          body: { data: { findPediaProfilePhotos: ProfilePhotosResDTO } };
        }) => {
          const {
            body: {
              data: {
                findPediaProfilePhotos: { result, error, profilePhotos },
              },
            },
          } = res;

          // then
          expect(result).toBe(true);
          expect(error).toBeNull();
          expect(profilePhotos.length).toBe(1);

          expect(profilePhotos[0].id).toBe(0);
          expect(profilePhotos[0].url).toBe(
            process.env.FAMILY_PEDIA_DEFAULT_IMG,
          );
          expect(profilePhotos[0].height).toBe(1500);
          expect(profilePhotos[0].width).toBe(2000);
        },
      );
  });

  // 2. create profile photo
  it('create profile photo', async () => {
    // given

    // when
    const query = `
      mutation {
        createPediaProfilePhoto(pediaId: ${TEST_USER_ID}) {
          result
          error
          presignedUrl
          pediaId
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: {
          body: { data: { createPediaProfilePhoto: CreateProfilePhotoResDTO } };
        }) => {
          const {
            body: {
              data: {
                createPediaProfilePhoto: {
                  result,
                  error,
                  presignedUrl: returnedUrl,
                  pediaId,
                },
              },
            },
          } = res;

          expect(result).toBe(true);
          expect(error).toBeNull();
          expect(returnedUrl).not.toBeNull();
          expect(pediaId).toBe(TEST_USER_ID);

          presignedUrl = returnedUrl;
        },
      );

    // then
    const strippedUrl = presignedUrl
      .replace(/^(https?:\/\/[^\/]+\.com\/)/, '')
      .split('?')[0];

    const profilePhoto = await profilePhotoRepository.find({
      where: { familyPediaId: TEST_USER_ID },
      order: { id: 'DESC' },
      take: 1,
    });

    expect(profilePhoto.length).toBe(1);
    expect(profilePhoto[0].url).toBe(strippedUrl);
    expect(profilePhoto[0].uploaded).toBe(false);

    // 뒷정리
    // const deleteResult = await profilePhotoRepository.delete({
    //   familyPediaId: TEST_USER_ID,
    // });

    // expect(deleteResult.affected).toBe(1);
  });

  // 3. upload completed
  it('upload completed', async () => {
    // given
    // 위 create photo 테스트에서 생성된 presignedUrls
    const testFilePath = path.join(__dirname, 'utils', 'test-image.jpeg');
    const testFile = fs.readFileSync(testFilePath);

    await putObjectS3(presignedUrl, testFile);

    const strippedUrl = presignedUrl
      .replace(/^(https?:\/\/[^\/]+\.com\/)/, '')
      .split('?')[0];

    const testWidth = 800;
    const testHeight = 400;

    // when
    const query = `
      mutation {
        pediaProfilePhotoUploadCompleted(pediaId: ${TEST_USER_ID}, url: "${strippedUrl}", width: ${testWidth}, height: ${testHeight}) {
          result
          error
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: {
          body: { data: { pediaProfilePhotoUploadCompleted: BaseResponseDTO } };
        }) => {
          const {
            body: {
              data: {
                pediaProfilePhotoUploadCompleted: { result, error },
              },
            },
          } = res;

          expect(result).toBe(true);
          expect(error).toBeNull();
        },
      );

    // then
    const profilePhoto = await profilePhotoRepository.find({
      where: { familyPediaId: TEST_USER_ID },
      order: { id: 'DESC' },
      take: 1,
    });

    expect(profilePhoto.length).toBe(1);
    expect(profilePhoto[0].url).toBe(strippedUrl);
    expect(profilePhoto[0].uploaded).toBe(true);
    expect(profilePhoto[0].width).toBe(testWidth);
    expect(profilePhoto[0].height).toBe(testHeight);

    createProfilePhotoId = profilePhoto[0].id;

    const pedia = await pediaRepository.findOne({
      where: { ownerId: TEST_USER_ID },
    });

    expect(pedia.profilePhoto).toBe(strippedUrl);
  });

  // 4. find photos 성공
  it('find photos - after upload', async () => {
    // given
    // pedia.ownerId = TEST_USER_ID already exists in test db

    // when
    const query = `
      query {
	      findPediaProfilePhotos(pediaId: ${TEST_USER_ID}) {
          result
          error
          profilePhotos {
            id
            url
          }
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: {
          body: { data: { findPediaProfilePhotos: ProfilePhotosResDTO } };
        }) => {
          const {
            body: {
              data: {
                findPediaProfilePhotos: { result, error, profilePhotos },
              },
            },
          } = res;

          // then
          expect(result).toBe(true);
          expect(error).toBeNull();
          expect(profilePhotos.length).toBe(1);

          const strippedUrl = presignedUrl
            .replace(/^(https?:\/\/[^\/]+\.com\/)/, '')
            .split('?')[0];

          expect(profilePhotos[0].id).toBeGreaterThan(1);
          expect(profilePhotos[0].url).toBe(strippedUrl);
          // expect(profilePhotos[0].height).toBe(1500);
          // expect(profilePhotos[0].width).toBe(2000);
        },
      );
  });

  // 5. 업로드 한 사진 삭제
  it('delete photo', async () => {
    // given

    // when
    const query = `
      mutation {
        deletePediaProfilePhoto(photoId: ${createProfilePhotoId}) {
          result
          error
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: {
          body: { data: { deletePediaProfilePhoto: BaseResponseDTO } };
        }) => {
          const {
            body: {
              data: {
                deletePediaProfilePhoto: { result, error },
              },
            },
          } = res;

          expect(result).toBe(true);
          expect(error).toBeNull();
        },
      );

    // then
    const profilePhoto = await profilePhotoRepository.findOne({
      where: { id: createProfilePhotoId },
    });

    expect(profilePhoto).toBeNull();

    const pedia = await pediaRepository.findOne({
      where: { ownerId: TEST_USER_ID },
    });

    expect(pedia.profilePhoto).toBe(process.env.FAMILY_PEDIA_DEFAULT_IMG);

    const targetUrl = presignedUrl.split('?')[0];
    axios.get(targetUrl).catch((err) => {
      expect(err.response.status).toBe(403);
    });
  });
});

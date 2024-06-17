import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { LetterEmotionType } from 'src/letter/constants/letter-emotion-type.enum';
import { Letter } from 'src/letter/entities/letter.entity';
import { In, Repository } from 'typeorm';
import {
  TEST_FAMILY_USER_ID1,
  TEST_FAMILY_USER_ID2,
  TEST_USER_ID,
} from './utils/config';
import { gqlAuthReq } from './utils/request';
import { CreateResDTO } from 'src/common/dto/create-res.dto';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { LetterGuide } from 'src/letter/entities/letter-guide.entity';
import { LetterGuideResDTO } from 'src/letter/dto/letter-guide-res.dto';
import { LetterType } from 'src/letter/constants/letter-type.enum';
import { LetterResDTO } from 'src/letter/dto/letter-res.dto';
import { LetterBoxType } from 'src/letter/constants/letter-box-type.enum';
import { LetterBoxResDTO } from 'src/letter/dto/letter-box-res.dto';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

describe('Letter module (e2e)', () => {
  let app: INestApplication;
  let letterRepository: Repository<Letter>;
  let letterGuideRepository: Repository<LetterGuide>;

  const testTitle = 'test title';
  const testPayload = 'test payload';
  const testEmotion = LetterEmotionType.happy;
  const invalidFamilyMemberId = 7;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    letterRepository = app.get('LetterRepository');
    letterGuideRepository = app.get('LetterGuideRepository');

    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('send letter - 즉시 전송', async () => {
    // given
    const testReceivers = [TEST_FAMILY_USER_ID1, TEST_FAMILY_USER_ID2];

    // when
    let resLetterId: number;

    const query = `
      mutation {
        sendLetter(
          title: "${testTitle}",
          payload: "${testPayload}",
          emotion: ${testEmotion},
          isTimeCapsule: ${false},
          receivers: ${JSON.stringify(testReceivers)},
          isTemp: ${false}
        ) {
          result
          error
          id
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { sendLetter: CreateResDTO } } }) => {
        const {
          body: {
            data: {
              sendLetter: { result, error, id },
            },
          },
        } = res;

        resLetterId = id;

        expect(result).toBe(true);
        expect(error).toBeNull();
      });

    // then
    const lettersCreated = await letterRepository.find({
      order: { id: 'DESC' },
      take: testReceivers.length,
    });

    expect(resLetterId).toBe(lettersCreated[0].id);

    // letterService에서 Promise.all 처리하기에 반드시 정렬 보장할 수 없어서 테스트용 보정
    lettersCreated.sort((a, b) => a.receiverId - b.receiverId);

    lettersCreated.forEach((letter, idx) => {
      expect(letter.receiverId).toBe(testReceivers[idx]);

      expect(letter.senderId).toBe(TEST_USER_ID);
      expect(letter.title).toBe(testTitle);
      expect(letter.payload).toBe(testPayload);
      expect(letter.emotion).toBe(testEmotion);

      expect(letter.isTemp).toBe(false);
      expect(letter.isRead).toBe(false);
      expect(letter.isTimeCapsule).toBe(false);
      expect(letter.kept).toBe(false);
    });

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: In(lettersCreated.map((letter) => letter.id)),
    });

    expect(res.affected).toBe(2);
  });

  it('send letter - 임시저장', async () => {
    // given
    const testReceivers = [TEST_FAMILY_USER_ID1, TEST_FAMILY_USER_ID2];

    // when
    let resLetterId: number;

    const query = `
      mutation {
        sendLetter(
          title: "${testTitle}",
          payload: "${testPayload}",
          emotion: ${testEmotion},
          isTimeCapsule: ${false},
          receivers: ${JSON.stringify(testReceivers)},
          isTemp: ${true}
        ) {
          result
          error
          id
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { sendLetter: CreateResDTO } } }) => {
        const {
          body: {
            data: {
              sendLetter: { result, error, id },
            },
          },
        } = res;

        resLetterId = id;

        expect(result).toBe(true);
        expect(error).toBeNull();
      });

    // then
    // 임시저장은 receiver 여럿이어도 하나만 저장
    const letterTempSaved = await letterRepository.find({
      order: { id: 'DESC' },
      take: 1,
    });

    expect(resLetterId).toBe(letterTempSaved[0].id);

    expect(letterTempSaved[0].receiverId).toBeNull();

    expect(letterTempSaved[0].senderId).toBe(TEST_USER_ID);
    expect(letterTempSaved[0].title).toBe(testTitle);
    expect(letterTempSaved[0].payload).toBe(testPayload);
    expect(letterTempSaved[0].emotion).toBe(testEmotion);

    expect(letterTempSaved[0].isTemp).toBe(true);
    expect(letterTempSaved[0].isRead).toBe(false);
    expect(letterTempSaved[0].isTimeCapsule).toBe(false);
    expect(letterTempSaved[0].kept).toBe(false);

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: letterTempSaved[0].id,
    });

    expect(res.affected).toBe(1);
  });

  it('send letter - 임시저장 --> 실제 전송', async () => {
    // given

    const testTitle2 = 'test title2';
    const testPayload2 = 'test payload2';
    const testReceivers = [TEST_FAMILY_USER_ID1, TEST_FAMILY_USER_ID2];

    const tempLetter = await letterRepository.insert({
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      isTimeCapsule: false,
      receiveDate: new Date(),
      sender: { id: TEST_USER_ID },
      isTemp: true,
    });

    const tempLetterId = tempLetter.raw?.insertId;

    // when
    let resSentLetterId: number;

    const query = `
      mutation {
        sendLetter(
          title: "${testTitle2}",
          payload: "${testPayload2}",
          emotion: ${testEmotion},
          isTimeCapsule: ${false},
          receivers: ${JSON.stringify(testReceivers)},
          isTemp: ${false}
        ) {
          result
          error
          id
        }

        deleteLetter(id: ${tempLetterId}) {
          result
          error
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: {
          body: {
            data: { sendLetter: CreateResDTO; deleteLetter: BaseResponseDTO };
          };
        }) => {
          const {
            body: {
              data: { sendLetter, deleteLetter },
            },
          } = res;

          expect(sendLetter.result).toBe(true);
          expect(sendLetter.error).toBeNull();
          resSentLetterId = sendLetter.id;

          expect(deleteLetter.result).toBe(true);
          expect(deleteLetter.error).toBeNull();
        },
      );

    // then

    // 1. 전송 완료 편지 테스트 (임시저장 X)
    const sentLetters = await letterRepository.find({
      order: { id: 'DESC' },
      take: 2,
    });

    expect(sentLetters[0].id).toBe(resSentLetterId);

    // letterService에서 Promise.all 처리하기에 반드시 정렬 보장할 수 없어서 테스트용 보정
    sentLetters.sort((a, b) => a.receiverId - b.receiverId);

    sentLetters.forEach((letter, idx) => {
      expect(letter.receiverId).toBe(testReceivers[idx]);

      expect(letter.senderId).toBe(TEST_USER_ID);
      expect(letter.title).toBe(testTitle2);
      expect(letter.payload).toBe(testPayload2);
      expect(letter.emotion).toBe(testEmotion);

      expect(letter.isTemp).toBe(false);
      expect(letter.isRead).toBe(false);
      expect(letter.isTimeCapsule).toBe(false);
      expect(letter.kept).toBe(false);
    });

    // 2. 임시저장 편지 테스트
    const tempLetterExist = await letterRepository.findOne({
      where: { id: tempLetterId },
    });

    expect(tempLetterExist).toBeNull();

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: In(sentLetters.map((letter) => letter.id)),
    });

    expect(res.affected).toBe(2);
  });

  it('send letter - 타임캡슐', async () => {
    // given
    const testTitle = 'test title';
    const testPayload = 'test payload';
    const testEmotion = LetterEmotionType.comfort;
    const testReceivers = [TEST_FAMILY_USER_ID1, TEST_FAMILY_USER_ID2];

    const now = new Date().getTime();
    const testReceiveDate = new Date(
      now - (now % 1000) + 1000 * 60 * 60 * 24 * 30 + 1000 * 60 * 60 * 5,
    ); // 30일 5시간 뒤

    // when
    let resLetterId: number;

    const query = `
      mutation {
        sendLetter(
          title: "${testTitle}",
          payload: "${testPayload}",
          emotion: ${testEmotion},
          isTimeCapsule: ${true},
          receiveDate: "${testReceiveDate.toISOString()}"
          receivers: ${JSON.stringify(testReceivers)},
          isTemp: ${false}
        ) {
          result
          error
          id
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { sendLetter: CreateResDTO } } }) => {
        const {
          body: {
            data: {
              sendLetter: { result, error, id },
            },
          },
        } = res;

        resLetterId = id;

        expect(result).toBe(true);
        expect(error).toBeNull();
      });

    // then
    const lettersCreated = await letterRepository.find({
      order: { id: 'DESC' },
      take: testReceivers.length,
    });

    expect(resLetterId).toBe(lettersCreated[0].id);

    // letterService에서 Promise.all 처리하기에 반드시 정렬 보장할 수 없어서 테스트용 보정
    lettersCreated.sort((a, b) => a.receiverId - b.receiverId);

    lettersCreated.forEach((letter, idx) => {
      expect(letter.receiverId).toBe(testReceivers[idx]);

      expect(letter.senderId).toBe(TEST_USER_ID);
      expect(letter.title).toBe(testTitle);
      expect(letter.payload).toBe(testPayload);
      expect(letter.emotion).toBe(testEmotion);

      expect(letter.receiveDate).toEqual(testReceiveDate);

      expect(letter.isTemp).toBe(false);
      expect(letter.isRead).toBe(false);
      expect(letter.isTimeCapsule).toBe(true);
      expect(letter.kept).toBe(false);
    });

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: In(lettersCreated.map((letter) => letter.id)),
    });

    expect(res.affected).toBe(2);
  });

  it('send letter - 가족 아닌 사용자에게 전송 실패', async () => {
    // given
    const testReceivers = [invalidFamilyMemberId, TEST_FAMILY_USER_ID2];

    // when
    const query = `
      mutation {
        sendLetter(
          title: "${testTitle}",
          payload: "${testPayload}",
          emotion: ${testEmotion},
          isTimeCapsule: ${false},
          receivers: ${JSON.stringify(testReceivers)},
          isTemp: ${false}
        ) {
          result
          error
          id
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { sendLetter: CreateResDTO } } }) => {
        const {
          body: {
            data: {
              sendLetter: { result, error, id },
            },
          },
        } = res;

        // then
        expect(result).toBe(false);
        expect(error).toBe('Request with invalid receivers.');
        expect(id).toBeNull();
      });
  });

  it('edit letter', async () => {
    // given
    const testReceiverId = TEST_FAMILY_USER_ID1;
    const testReceiveDate = new Date(new Date().getTime() + 1000 * 60 * 30);

    const testLetter = await letterRepository.insert({
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: TEST_USER_ID },
      receiver: { id: testReceiverId },
      isTimeCapsule: true,
      receiveDate: testReceiveDate,
      isTemp: false,
    });

    const testLetterId = testLetter.raw?.insertId;

    const editTitle = 'edit title';
    const editPayload = 'edit payload';
    const editEmotion = LetterEmotionType.sad;
    const editIsTimeCapule = false;

    // then
    const query = `
      mutation {
        editLetter(
          id: ${testLetterId},
          title: "${editTitle}",
          payload: "${editPayload}",
          emotion: ${editEmotion},
          isTimeCapsule: ${editIsTimeCapule},
          isTemp: ${false}
        ) {
          result
          error
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { editLetter: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              editLetter: { result, error },
            },
          },
        } = res;

        expect(result).toBe(true);
        expect(error).toBeNull();
      });

    // then
    const letterEditted = await letterRepository.findOne({
      where: { id: testLetterId },
    });

    expect(letterEditted.id).toBe(testLetterId);
    expect(letterEditted.title).toBe(editTitle);
    expect(letterEditted.payload).toBe(editPayload);
    expect(letterEditted.emotion).toBe(editEmotion);
    expect(letterEditted.isTimeCapsule).toBe(editIsTimeCapule);
    expect(letterEditted.receiveDate).not.toBe(testReceiveDate);

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: testLetterId,
    });

    expect(res.affected).toBe(1);
  });

  it('edit letter - receiver 이미 읽은 경우 에러', async () => {
    // given
    const testReceiverId = TEST_FAMILY_USER_ID1;

    const testLetter = await letterRepository.insert({
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: TEST_USER_ID },
      receiver: { id: testReceiverId },
      isTimeCapsule: false,
      receiveDate: new Date(),
      isTemp: false,
      isRead: true,
    });

    const testLetterId = testLetter.raw?.insertId;

    const editTitle = 'edit title';
    const editPayload = 'edit payload';
    const editEmotion = LetterEmotionType.sad;
    const editIsTimeCapule = false;

    // then
    const query = `
      mutation {
        editLetter(
          id: ${testLetterId},
          title: "${editTitle}",
          payload: "${editPayload}",
          emotion: ${editEmotion},
          isTimeCapsule: ${editIsTimeCapule},
          isTemp: ${false}
        ) {
          result
          error
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { editLetter: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              editLetter: { result, error },
            },
          },
        } = res;

        // then
        expect(result).toBe(false);
        expect(error).toBe('Cannot edit letter. (Cannot update the entity)');
      });

    const letterNotEditted = await letterRepository.findOne({
      where: { id: testLetterId },
    });

    expect(letterNotEditted.id).toBe(testLetterId);
    expect(letterNotEditted.title).toBe(testTitle);
    expect(letterNotEditted.payload).toBe(testPayload);
    expect(letterNotEditted.emotion).toBe(testEmotion);
    expect(letterNotEditted.isTimeCapsule).toBe(false);
    expect(letterNotEditted.isTemp).toBe(false);

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: testLetterId,
    });

    expect(res.affected).toBe(1);
  });

  it('edit letter - sender 아닌 경우 에러', async () => {
    // given
    const testReceiverId = TEST_FAMILY_USER_ID1;

    const testLetter = await letterRepository.insert({
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: TEST_FAMILY_USER_ID2 },
      receiver: { id: testReceiverId },
      isTimeCapsule: false,
      receiveDate: new Date(),
      isTemp: false,
    });

    const testLetterId = testLetter.raw?.insertId;

    const editTitle = 'edit title';
    const editPayload = 'edit payload';
    const editEmotion = LetterEmotionType.sad;
    const editIsTimeCapule = false;

    // then
    const query = `
      mutation {
        editLetter(
          id: ${testLetterId},
          title: "${editTitle}",
          payload: "${editPayload}",
          emotion: ${editEmotion},
          isTimeCapsule: ${editIsTimeCapule},
          isTemp: ${false}
        ) {
          result
          error
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { editLetter: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              editLetter: { result, error },
            },
          },
        } = res;

        // then
        expect(result).toBe(false);
        expect(error).toBe('Cannot edit letter. (Cannot update the entity)');
      });

    const letterNotEditted = await letterRepository.findOne({
      where: { id: testLetterId },
    });

    expect(letterNotEditted.id).toBe(testLetterId);
    expect(letterNotEditted.title).toBe(testTitle);
    expect(letterNotEditted.payload).toBe(testPayload);
    expect(letterNotEditted.emotion).toBe(testEmotion);
    expect(letterNotEditted.isTimeCapsule).toBe(false);
    expect(letterNotEditted.isTemp).toBe(false);

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: testLetterId,
    });

    expect(res.affected).toBe(1);
  });

  it('read letter', async () => {
    // given
    const testSenderId = TEST_FAMILY_USER_ID1;

    const testLetter = await letterRepository.insert({
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: testSenderId },
      receiver: { id: TEST_USER_ID },
      isTimeCapsule: false,
      receiveDate: new Date(),
      isTemp: false,
    });

    const testLetterId = testLetter.raw?.insertId;

    // when
    const query = `
      mutation {
        readLetter(id: ${testLetterId}) {
          result
          error
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { readLetter: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              readLetter: { result, error },
            },
          },
        } = res;

        expect(result).toBe(true);
        expect(error).toBeNull();
      });

    // then
    const letterRead = await letterRepository.findOne({
      where: { id: testLetterId },
    });

    expect(letterRead.id).toBe(testLetterId);
    expect(letterRead.title).toBe(testTitle);
    expect(letterRead.payload).toBe(testPayload);
    expect(letterRead.emotion).toBe(testEmotion);
    expect(letterRead.isTimeCapsule).toBe(false);
    expect(letterRead.isTemp).toBe(false);

    expect(letterRead.isRead).toBe(true);

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: testLetterId,
    });

    expect(res.affected).toBe(1);
  });

  it('read letter - receiver 아닌 경우 에러', async () => {
    // given
    const testSenderId = TEST_FAMILY_USER_ID1;

    const testLetter = await letterRepository.insert({
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: TEST_USER_ID },
      receiver: { id: testSenderId },
      isTimeCapsule: false,
      receiveDate: new Date(),
      isTemp: false,
    });

    const testLetterId = testLetter.raw?.insertId;

    // when
    const query = `
      mutation {
        readLetter(id: ${testLetterId}) {
          result
          error
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { readLetter: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              readLetter: { result, error },
            },
          },
        } = res;

        // then
        expect(result).toBe(false);
        expect(error).toBe(
          'Cannot update letter status to read. (Cannot update the entity)',
        );
      });

    // then
    const letterRead = await letterRepository.findOne({
      where: { id: testLetterId },
    });

    expect(letterRead.id).toBe(testLetterId);
    expect(letterRead.title).toBe(testTitle);
    expect(letterRead.payload).toBe(testPayload);
    expect(letterRead.emotion).toBe(testEmotion);
    expect(letterRead.isTimeCapsule).toBe(false);
    expect(letterRead.isTemp).toBe(false);

    expect(letterRead.isRead).toBe(false);

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: testLetterId,
    });

    expect(res.affected).toBe(1);
  });

  it('delete letter', async () => {
    // given
    const testReceiverId = TEST_FAMILY_USER_ID1;

    const testLetter = await letterRepository.insert({
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: TEST_USER_ID },
      receiver: { id: testReceiverId },
      isTimeCapsule: false,
      receiveDate: new Date(),
      isTemp: false,
    });

    const testLetterId = testLetter.raw?.insertId;

    // when
    const query = `
      mutation {
        deleteLetter(id: ${testLetterId}) {
          result
          error
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { deleteLetter: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              deleteLetter: { result, error },
            },
          },
        } = res;

        expect(result).toBe(true);
        expect(error).toBeNull();
      });

    // then
    const testeLetter = await letterRepository.findOne({
      where: { id: testLetterId },
    });

    expect(testeLetter).toBeNull();
  });

  it('delete letter - receiver 아닌 경우 에러', async () => {
    // given
    const testSenderId = TEST_FAMILY_USER_ID1;

    const testLetter = await letterRepository.insert({
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: testSenderId },
      receiver: { id: TEST_USER_ID },
      isTimeCapsule: false,
      receiveDate: new Date(),
      isTemp: false,
    });

    const testLetterId = testLetter.raw?.insertId;

    // when
    const query = `
      mutation {
        deleteLetter(id: ${testLetterId}) {
          result
          error
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { deleteLetter: BaseResponseDTO } } }) => {
        const {
          body: {
            data: {
              deleteLetter: { result, error },
            },
          },
        } = res;

        // then
        expect(result).toBe(false);
        expect(error).toBe('Cannot delete the letter.');
      });

    // then
    const letterRead = await letterRepository.findOne({
      where: { id: testLetterId },
    });

    expect(letterRead.id).toBe(testLetterId);
    expect(letterRead.title).toBe(testTitle);
    expect(letterRead.payload).toBe(testPayload);
    expect(letterRead.emotion).toBe(testEmotion);
    expect(letterRead.isTimeCapsule).toBe(false);
    expect(letterRead.isTemp).toBe(false);
    expect(letterRead.isRead).toBe(false);

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: testLetterId,
    });

    expect(res.affected).toBe(1);
  });

  it('find letter - SENT', async () => {
    // given
    const testReceiverId = TEST_FAMILY_USER_ID1;

    const testLetter = await letterRepository.insert({
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: TEST_USER_ID },
      receiver: { id: testReceiverId },
      isTimeCapsule: false,
      receiveDate: new Date(),
      isTemp: false,
    });

    const testLetterId = testLetter.raw?.insertId;

    // when
    const query = `
      query {
        findLetter(id: ${testLetterId}, type: ${LetterType.SENT}) {
          result
          error
          letter {
            id
            title
            payload
            emotion
            senderId
            receiver {
              id
              userName
            }
            isTimeCapsule
            receiveDate
            isTemp
            isRead
            kept
          }
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findLetter: LetterResDTO } } }) => {
        const {
          body: {
            data: {
              findLetter: { result, error, letter },
            },
          },
        } = res;

        // then
        expect(result).toBe(true);
        expect(error).toBeNull();

        expect(letter.senderId).toBe(TEST_USER_ID);
        expect(letter.receiver.id).toBe(testReceiverId);
        expect(letter.receiver.userName).not.toBeNull();

        expect(letter.id).toBe(testLetterId);
        expect(letter.title).toBe(testTitle);
        expect(letter.payload).toBe(testPayload);
        expect(letter.emotion).toBe(testEmotion);
        expect(letter.isTimeCapsule).toBe(false);
        expect(letter.isTemp).toBe(false);
        expect(letter.isRead).toBe(false);
        expect(letter.kept).toBe(false);
      });

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: testLetterId,
    });

    expect(res.affected).toBe(1);
  });

  it('find letter - SENT, sender 아닌 경우 에러', async () => {
    // given
    const testSenderId = TEST_FAMILY_USER_ID2;
    const testReceiverId = TEST_FAMILY_USER_ID1;

    const testLetter = await letterRepository.insert({
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: testSenderId },
      receiver: { id: testReceiverId },
      isTimeCapsule: false,
      receiveDate: new Date(),
      isTemp: false,
    });

    const testLetterId = testLetter.raw?.insertId;

    // when
    const query = `
      query {
        findLetter(id: ${testLetterId}, type: ${LetterType.SENT}) {
          result
          error
          letter {
            id
            title
            payload
            emotion
            senderId
            receiver {
              id
              userName
            }
            isTimeCapsule
            receiveDate
            isTemp
            isRead
            kept
          }
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findLetter: LetterResDTO } } }) => {
        const {
          body: {
            data: {
              findLetter: { result, error, letter },
            },
          },
        } = res;

        // then
        expect(result).toBe(false);
        expect(error).not.toBeNull();
        expect(letter).toBeNull();
      });

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: testLetterId,
    });

    expect(res.affected).toBe(1);
  });

  it('find letter - RECEIVED', async () => {
    // given
    const testSenderId = TEST_FAMILY_USER_ID1;

    const testLetter = await letterRepository.insert({
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: testSenderId },
      receiver: { id: TEST_USER_ID },
      isTimeCapsule: false,
      receiveDate: new Date(),
      isTemp: false,
    });

    const testLetterId = testLetter.raw?.insertId;

    // when
    const query = `
      query {
        findLetter(id: ${testLetterId}, type: ${LetterType.RECEIVED}) {
          result
          error
          letter {
            id
            title
            payload
            emotion
            sender {
              id
              userName
            }
            receiverId
            isTimeCapsule
            receiveDate
            isTemp
            isRead
            kept
          }
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findLetter: LetterResDTO } } }) => {
        const {
          body: {
            data: {
              findLetter: { result, error, letter },
            },
          },
        } = res;

        // then
        expect(result).toBe(true);
        expect(error).toBeNull();

        expect(letter.sender.id).toBe(testSenderId);
        expect(letter.sender.userName).not.toBeNull();
        expect(letter.receiverId).toBe(TEST_USER_ID);

        expect(letter.id).toBe(testLetterId);
        expect(letter.title).toBe(testTitle);
        expect(letter.payload).toBe(testPayload);
        expect(letter.emotion).toBe(testEmotion);
        expect(letter.isTimeCapsule).toBe(false);
        expect(letter.isTemp).toBe(false);
        expect(letter.isRead).toBe(false);
        expect(letter.kept).toBe(false);
      });

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: testLetterId,
    });

    expect(res.affected).toBe(1);
  });

  it('find letter - RECEIVED, receiver 아닌 경우 에러', async () => {
    // given
    const testSenderId = TEST_FAMILY_USER_ID2;
    const testReceiverId = TEST_FAMILY_USER_ID1;

    const testLetter = await letterRepository.insert({
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: testSenderId },
      receiver: { id: testReceiverId },
      isTimeCapsule: false,
      receiveDate: new Date(),
      isTemp: false,
    });

    const testLetterId = testLetter.raw?.insertId;

    // when
    const query = `
      query {
        findLetter(id: ${testLetterId}, type: ${LetterType.RECEIVED}) {
          result
          error
          letter {
            id
            title
            payload
            emotion
            sender {
              id
              userName
            }
            receiverId
            isTimeCapsule
            receiveDate
            isTemp
            isRead
            kept
          }
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findLetter: LetterResDTO } } }) => {
        const {
          body: {
            data: {
              findLetter: { result, error, letter },
            },
          },
        } = res;

        // then
        expect(result).toBe(false);
        expect(error).not.toBeNull();
        expect(letter).toBeNull();
      });

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: testLetterId,
    });

    expect(res.affected).toBe(1);
  });

  it('find letter box - ALL & SENT', async () => {
    // given
    const letterFragment: QueryDeepPartialEntity<Letter> = {
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: TEST_USER_ID },
      isTemp: false,
      kept: false,
    };

    const {
      raw: { insertId: testLetterId1 },
    } = await letterRepository.insert({
      ...letterFragment,
      receiver: { id: TEST_FAMILY_USER_ID1 },
      isTimeCapsule: false,
      receiveDate: new Date(),
    });

    const {
      raw: { insertId: testLetterId2 },
    } = await letterRepository.insert({
      ...letterFragment,
      receiver: { id: TEST_FAMILY_USER_ID1 },
      isTimeCapsule: false,
      receiveDate: new Date(),
    });

    const {
      raw: { insertId: testLetterId3 },
    } = await letterRepository.insert({
      ...letterFragment,
      receiver: { id: TEST_FAMILY_USER_ID2 },
      isTimeCapsule: true,
      receiveDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 5),
    });

    const take = 2;
    const prev = 0;

    const expectedLetterIdSeq = [testLetterId3, testLetterId2];

    // when
    const query = `
      query {
        findLetterBox(type: ${LetterType.SENT}, boxType: ${LetterBoxType.ALL}, take: ${take}, prev: ${prev}) {
            result
            error
            letters {
              id
              title
              payload
              emotion
              senderId
              receiver {
                id
                userName
              }
              isTimeCapsule
              receiveDate
              isTemp
              isRead
              kept
            }
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findLetterBox: LetterBoxResDTO } } }) => {
        const {
          body: {
            data: {
              findLetterBox: { result, error, letters },
            },
          },
        } = res;

        // then
        expect(result).toBe(true);
        expect(error).toBeNull();
        expect(letters.length).toBe(take);

        letters.forEach((letter, idx) => {
          expect(letter.id).toBe(expectedLetterIdSeq[idx]);

          expect(letter.title).toBe(testTitle);
          expect(letter.payload).toBe(testPayload);
          expect(letter.emotion).toBe(testEmotion);
          expect(letter.isTimeCapsule).toBe(!Boolean(idx % 2));
          expect(letter.isTemp).toBe(false);
          expect(letter.isRead).toBe(false);
          expect(letter.kept).toBe(false);
        });
      });

    // 엔티티 정리
    const res = await letterRepository.delete({
      id: In([testLetterId1, testLetterId2, testLetterId3]),
    });

    expect(res.affected).toBe(3);
  });

  it('find letter box - ALL & SENT - 임시저장 우선 정렬 테스트', async () => {
    // given
    const letterFragment: QueryDeepPartialEntity<Letter> = {
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: TEST_USER_ID },
      kept: false,
    };

    const {
      raw: { insertId: testLetterId1 },
    } = await letterRepository.insert({
      ...letterFragment,
      receiver: { id: TEST_FAMILY_USER_ID1 },
      isTimeCapsule: false,
      receiveDate: new Date(),
      isTemp: true, // 유일한 임시저장
    });

    const {
      raw: { insertId: testLetterId2 },
    } = await letterRepository.insert({
      ...letterFragment,
      receiver: { id: TEST_FAMILY_USER_ID1 },
      isTimeCapsule: false,
      receiveDate: new Date(),
      isTemp: false,
    });

    const {
      raw: { insertId: testLetterId3 },
    } = await letterRepository.insert({
      ...letterFragment,
      receiver: { id: TEST_FAMILY_USER_ID2 },
      isTimeCapsule: true,
      receiveDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 5),
      isTemp: false,
    });

    const take = 2;
    const prev = 0;

    const expectedLetterIdSeq = [testLetterId1, testLetterId3];

    // when
    const query = `
      query {
        findLetterBox(type: ${LetterType.SENT}, boxType: ${LetterBoxType.ALL}, take: ${take}, prev: ${prev}) {
            result
            error
            letters {
              id
              title
              payload
              emotion
              senderId
              receiverId
              receiver {
                id
                userName
              }
              isTimeCapsule
              receiveDate
              isTemp
              isRead
              kept
            }
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findLetterBox: LetterBoxResDTO } } }) => {
        const {
          body: {
            data: {
              findLetterBox: { result, error, letters },
            },
          },
        } = res;

        // then
        expect(result).toBe(true);
        expect(error).toBeNull();
        expect(letters.length).toBe(take);

        letters.forEach((letter, idx) => {
          expect(letter.id).toBe(expectedLetterIdSeq[idx]);

          expect(letter.title).toBe(testTitle);
          expect(letter.payload).toBe(testPayload);
          expect(letter.emotion).toBe(testEmotion);
          expect(letter.isTimeCapsule).toBe(Boolean(idx % 2));
          expect(letter.isTemp).toBe(!Boolean(idx % 2));
          expect(letter.isRead).toBe(false);
          expect(letter.kept).toBe(false);
        });
      });

    // 엔티티 정리
    const res = await letterRepository.delete({
      id: In([testLetterId1, testLetterId2, testLetterId3]),
    });

    expect(res.affected).toBe(3);
  });

  it('find letter box - ALL & RECEIVED', async () => {
    // given
    const letterFragment: QueryDeepPartialEntity<Letter> = {
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      receiver: { id: TEST_USER_ID },
      isTemp: false,
      kept: false,
    };

    const {
      raw: { insertId: testLetterId1 },
    } = await letterRepository.insert({
      ...letterFragment,
      sender: { id: TEST_FAMILY_USER_ID1 },
      isTimeCapsule: false,
      receiveDate: new Date(new Date().getTime() - 1000 * 60 * 3), // mysql에 ms 단위 날아가서 오류 발생하는 것 방지
    });

    const {
      raw: { insertId: testLetterId2 },
    } = await letterRepository.insert({
      ...letterFragment,
      sender: { id: TEST_FAMILY_USER_ID1 },
      isTimeCapsule: false,
      receiveDate: new Date(new Date().getTime() - 1000 * 60 * 2), // mysql에 ms 단위 날아가서 오류 발생하는 것 방지
    });

    const {
      raw: { insertId: testLetterId3 },
    } = await letterRepository.insert({
      ...letterFragment,
      sender: { id: TEST_FAMILY_USER_ID2 },
      isTimeCapsule: true,
      receiveDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 5),
    });

    const take = 2;
    const prev = 0;

    const expectedLetterIdSeq = [testLetterId2, testLetterId1];

    // when
    const query = `
      query {
        findLetterBox(type: ${LetterType.RECEIVED}, boxType: ${LetterBoxType.ALL}, take: ${take}, prev: ${prev}) {
            result
            error
            letters {
              id
              title
              payload
              emotion
              sender {
                id
                userName
              }
              receiverId
              isTimeCapsule
              receiveDate
              isTemp
              isRead
              kept
            }
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findLetterBox: LetterBoxResDTO } } }) => {
        const {
          body: {
            data: {
              findLetterBox: { result, error, letters },
            },
          },
        } = res;

        // then
        expect(result).toBe(true);
        expect(error).toBeNull();
        expect(letters.length).toBe(take);

        letters.forEach((letter, idx) => {
          expect(letter.id).toBe(expectedLetterIdSeq[idx]);

          expect(letter.title).toBe(testTitle);
          expect(letter.payload).toBe(testPayload);
          expect(letter.emotion).toBe(testEmotion);
          expect(letter.isTimeCapsule).toBe(false);
          expect(letter.isTemp).toBe(false);
          expect(letter.isRead).toBe(false);
          expect(letter.kept).toBe(false);
        });
      });

    // 엔티티 정리
    const res = await letterRepository.delete({
      id: In([testLetterId1, testLetterId2, testLetterId3]),
    });

    expect(res.affected).toBe(3);
  });

  it('find letter box - Time Capsule Only & SENT', async () => {
    // given
    const letterFragment: QueryDeepPartialEntity<Letter> = {
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: TEST_USER_ID },
      isTemp: false,
      kept: false,
    };

    const {
      raw: { insertId: testLetterId1 },
    } = await letterRepository.insert({
      ...letterFragment,
      receiver: { id: TEST_FAMILY_USER_ID1 },
      isTimeCapsule: true,
      receiveDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 10), // 더 늦게 도착 TC (10일 뒤)
    });

    const {
      raw: { insertId: testLetterId2 },
    } = await letterRepository.insert({
      ...letterFragment,
      receiver: { id: TEST_FAMILY_USER_ID1 },
      isTimeCapsule: false,
      receiveDate: new Date(new Date().getTime() - 1000 * 60 * 2), // mysql에 ms 단위 날아가서 오류 발생하는 것 방지
    });

    const {
      raw: { insertId: testLetterId3 },
    } = await letterRepository.insert({
      ...letterFragment,
      receiver: { id: TEST_FAMILY_USER_ID2 },
      isTimeCapsule: true,
      receiveDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 5), // 더 일찍 도착 (5일 뒤)
    });

    const take = 2;
    const prev = 0;

    const expectedLetterIdSeq = [testLetterId1, testLetterId3];

    // when
    const query = `
        query {
          findLetterBox(type: ${LetterType.SENT}, boxType: ${LetterBoxType.TIME_CAPSULE}, take: ${take}, prev: ${prev}) {
              result
              error
              letters {
                id
                title
                payload
                emotion
                senderId
                receiver {
                  id
                  userName
                }
                isTimeCapsule
                receiveDate
                isTemp
                isRead
                kept
              }
          }
        }
      `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findLetterBox: LetterBoxResDTO } } }) => {
        const {
          body: {
            data: {
              findLetterBox: { result, error, letters },
            },
          },
        } = res;

        // then
        expect(result).toBe(true);
        expect(error).toBeNull();
        expect(letters.length).toBe(take);

        letters.forEach((letter, idx) => {
          expect(letter.id).toBe(expectedLetterIdSeq[idx]);

          expect(letter.title).toBe(testTitle);
          expect(letter.payload).toBe(testPayload);
          expect(letter.emotion).toBe(testEmotion);
          expect(letter.isTimeCapsule).toBe(true);
          expect(letter.isTemp).toBe(false);
          expect(letter.isRead).toBe(false);
          expect(letter.kept).toBe(false);
        });
      });

    // 엔티티 정리
    const res = await letterRepository.delete({
      id: In([testLetterId1, testLetterId2, testLetterId3]),
    });

    expect(res.affected).toBe(3);
  });

  it('find letter box - Time Capsule Only & RECEIVED', async () => {
    // given
    const letterFragment: QueryDeepPartialEntity<Letter> = {
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      receiver: { id: TEST_USER_ID },
      isTemp: false,
      kept: false,
    };

    const {
      raw: { insertId: testLetterId1 },
    } = await letterRepository.insert({
      ...letterFragment,
      sender: { id: TEST_FAMILY_USER_ID1 },
      isTimeCapsule: true,
      receiveDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 10), // 더 늦게 도착 TC (10일 뒤)
    });

    const {
      raw: { insertId: testLetterId2 },
    } = await letterRepository.insert({
      ...letterFragment,
      sender: { id: TEST_FAMILY_USER_ID1 },
      isTimeCapsule: false,
      receiveDate: new Date(new Date().getTime() - 1000 * 60 * 2), // mysql에 ms 단위 날아가서 오류 발생하는 것 방지
    });

    const {
      raw: { insertId: testLetterId3 },
    } = await letterRepository.insert({
      ...letterFragment,
      sender: { id: TEST_FAMILY_USER_ID2 },
      isTimeCapsule: true,
      receiveDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 5), // 더 일찍 도착 (5일 뒤)
    });

    const take = 2;
    const prev = 0;

    const expectedLetterIdSeq = [testLetterId1, testLetterId3];

    // when
    const query = `
      query {
        findLetterBox(type: ${LetterType.RECEIVED}, boxType: ${LetterBoxType.TIME_CAPSULE}, take: ${take}, prev: ${prev}) {
            result
            error
            letters {
              id
              title
              payload
              emotion
              sender {
                id
                userName
              }
              receiverId
              isTimeCapsule
              receiveDate
              isTemp
              isRead
              kept
            }
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findLetterBox: LetterBoxResDTO } } }) => {
        const {
          body: {
            data: {
              findLetterBox: { result, error, letters },
            },
          },
        } = res;

        // then
        expect(result).toBe(true);
        expect(error).toBeNull();
        expect(letters.length).toBe(take);

        letters.forEach((letter, idx) => {
          expect(letter.id).toBe(expectedLetterIdSeq[idx]);

          expect(letter.title).toBe(testTitle);
          expect(letter.payload).toBe(testPayload);
          expect(letter.emotion).toBe(testEmotion);
          expect(letter.isTimeCapsule).toBe(true);
          expect(letter.isTemp).toBe(false);
          expect(letter.isRead).toBe(false);
          expect(letter.kept).toBe(false);
        });
      });

    // 엔티티 정리
    const res = await letterRepository.delete({
      id: In([testLetterId1, testLetterId2, testLetterId3]),
    });

    expect(res.affected).toBe(3);
  });

  it('find letter box - KEPT (RECEIVED)', async () => {
    // given
    const letterFragment: QueryDeepPartialEntity<Letter> = {
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      receiver: { id: TEST_USER_ID },
      isTemp: false,
      isTimeCapsule: false,
      isRead: true,
    };

    const {
      raw: { insertId: testLetterId1 },
    } = await letterRepository.insert({
      ...letterFragment,
      sender: { id: TEST_FAMILY_USER_ID1 },
      receiveDate: new Date(new Date().getTime() - 1000 * 60 * 3), // mysql에 ms 단위 날아가서 오류 발생하는 것 방지
      kept: true,
    });

    const {
      raw: { insertId: testLetterId2 },
    } = await letterRepository.insert({
      ...letterFragment,
      sender: { id: TEST_FAMILY_USER_ID1 },
      receiveDate: new Date(new Date().getTime() - 1000 * 60 * 2), // mysql에 ms 단위 날아가서 오류 발생하는 것 방지
      kept: true,
    });

    const {
      raw: { insertId: testLetterId3 },
    } = await letterRepository.insert({
      ...letterFragment,
      sender: { id: TEST_FAMILY_USER_ID2 },
      receiveDate: new Date(new Date().getTime() - 1000 * 60 * 1), // mysql에 ms 단위 날아가서 오류 발생하는 것 방지
      kept: false,
    });

    const take = 2;
    const prev = 0;

    const expectedLetterIdSeq = [testLetterId2, testLetterId1];

    // when
    const query = `
      query {
        findLetterBox(type: ${LetterType.RECEIVED}, boxType: ${LetterBoxType.KEPT}, take: ${take}, prev: ${prev}) {
            result
            error
            letters {
              id
              title
              payload
              emotion
              sender {
                id
                userName
              }
              receiverId
              isTimeCapsule
              receiveDate
              isTemp
              isRead
              kept
            }
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findLetterBox: LetterBoxResDTO } } }) => {
        const {
          body: {
            data: {
              findLetterBox: { result, error, letters },
            },
          },
        } = res;

        // then
        expect(result).toBe(true);
        expect(error).toBeNull();
        expect(letters.length).toBe(take);

        letters.forEach((letter, idx) => {
          expect(letter.id).toBe(expectedLetterIdSeq[idx]);

          expect(letter.title).toBe(testTitle);
          expect(letter.payload).toBe(testPayload);
          expect(letter.emotion).toBe(testEmotion);
          expect(letter.isTimeCapsule).toBe(false);
          expect(letter.isTemp).toBe(false);
          expect(letter.isRead).toBe(true);
          expect(letter.kept).toBe(true);
        });
      });

    // 엔티티 정리
    const res = await letterRepository.delete({
      id: In([testLetterId1, testLetterId2, testLetterId3]),
    });

    expect(res.affected).toBe(3);
  });

  it('find letter box - KEPT - SENT 요청 에러 테스트', async () => {
    const query = `
      query {
        findLetterBox(type: ${LetterType.SENT}, boxType: ${LetterBoxType.KEPT}) {
            result
            error
            letters {
              id
              title
            }
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect((res: { body: { data: { findLetterBox: LetterBoxResDTO } } }) => {
        const {
          body: {
            data: {
              findLetterBox: { result, error, letters },
            },
          },
        } = res;

        // then
        expect(result).toBe(false);
        expect(error).toBe(
          'Request with invalid letter type. (No Kept letter box for SENT)',
        );
        expect(letters).toBeNull();
      });
  });

  it('edit letter kept - keep', async () => {
    // given
    const testSenderId = TEST_FAMILY_USER_ID1;

    const testLetter = await letterRepository.insert({
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: testSenderId },
      receiver: { id: TEST_USER_ID },
      isTimeCapsule: false,
      receiveDate: new Date(),
      isTemp: false,
    });

    const testLetterId = testLetter.raw?.insertId;

    // when
    const query = `
      mutation {
        editLetterKept(id: ${testLetterId}, kept: ${true}) {
          result
          error
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: { body: { data: { editLetterKept: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                editLetterKept: { result, error },
              },
            },
          } = res;

          expect(result).toBe(true);
          expect(error).toBeNull();
        },
      );

    // then
    const letterKept = await letterRepository.findOne({
      where: { id: testLetterId },
    });

    expect(letterKept.id).toBe(testLetterId);
    expect(letterKept.kept).toBe(true);

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: testLetterId,
    });

    expect(res.affected).toBe(1);
  });

  it('edit letter kept - unkeep', async () => {
    // given
    const testSenderId = TEST_FAMILY_USER_ID1;

    const testLetter = await letterRepository.insert({
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: testSenderId },
      receiver: { id: TEST_USER_ID },
      isTimeCapsule: false,
      receiveDate: new Date(),
      isTemp: false,
      kept: true,
    });

    const testLetterId = testLetter.raw?.insertId;

    // when
    const query = `
      mutation {
        editLetterKept(id: ${testLetterId}, kept: ${false}) {
          result
          error
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: { body: { data: { editLetterKept: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                editLetterKept: { result, error },
              },
            },
          } = res;

          expect(result).toBe(true);
          expect(error).toBeNull();
        },
      );

    // then
    const letterKept = await letterRepository.findOne({
      where: { id: testLetterId },
    });

    expect(letterKept.id).toBe(testLetterId);
    expect(letterKept.kept).toBe(false);

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: testLetterId,
    });

    expect(res.affected).toBe(1);
  });

  it('edit letter kept - receiver 아닌 경우 에러', async () => {
    // given
    const testReceiverId = TEST_FAMILY_USER_ID1;

    const testLetter = await letterRepository.insert({
      title: testTitle,
      payload: testPayload,
      emotion: testEmotion,
      sender: { id: TEST_USER_ID },
      receiver: { id: testReceiverId },
      isTimeCapsule: false,
      receiveDate: new Date(),
      isTemp: false,
    });

    const testLetterId = testLetter.raw?.insertId;

    // when
    const query = `
      mutation {
        editLetterKept(id: ${testLetterId}, kept: ${true}) {
          result
          error
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: { body: { data: { editLetterKept: BaseResponseDTO } } }) => {
          const {
            body: {
              data: {
                editLetterKept: { result, error },
              },
            },
          } = res;

          expect(result).toBe(false);
          expect(error).toBe(
            'Cannot edit letter kept. (Cannot update the entity)',
          );
        },
      );

    // then
    const letterKept = await letterRepository.findOne({
      where: { id: testLetterId },
    });

    expect(letterKept.id).toBe(testLetterId);
    expect(letterKept.kept).toBe(false);

    // 생성한 테스트 letter 삭제
    const res = await letterRepository.delete({
      id: testLetterId,
    });

    expect(res.affected).toBe(1);
  });

  it('get letter guide', async () => {
    // given
    await letterGuideRepository.insert({
      title: 'title 1',
      payload: 'payload 1',
      emotion: LetterEmotionType.happy,
      isPinned: true,
    });

    await letterGuideRepository.insert([
      {
        title: 'title 2',
        payload: 'payload 2',
        emotion: LetterEmotionType.comfort,
        isPinned: true,
      },
      {
        title: 'title 3',
        payload: 'payload 3',
        emotion: LetterEmotionType.sad,
        isPinned: false,
      },
    ]);

    // when
    const query = `
      query {
        getLetterGuide {
          result
          error
          letterGuide {
            title
            payload
            emotion
            isPinned
          }
        }
      }
    `;

    await gqlAuthReq(app, query)
      .expect(200)
      .expect(
        (res: { body: { data: { getLetterGuide: LetterGuideResDTO } } }) => {
          const {
            body: {
              data: {
                getLetterGuide: { result, error, letterGuide },
              },
            },
          } = res;

          // then
          expect(result).toBe(true);
          expect(error).toBeNull();

          expect(letterGuide.title).toBe('title 2');
          expect(letterGuide.payload).toBe('payload 2');
          expect(letterGuide.emotion).toBe(LetterEmotionType.comfort);
          expect(letterGuide.isPinned).toBe(true);
        },
      );

    // 생성된 테스트용 엔티티 정리
    const res = await letterGuideRepository.delete({
      title: In(['title 1', 'title 2', 'title 3']),
    });

    expect(res.affected).toBe(3);
  });
});

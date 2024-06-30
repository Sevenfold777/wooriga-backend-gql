import { SqsNotificationService } from './../sqs-notification/sqs-notification.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DAU } from 'src/admin/user/entities/dau.entity';
import { MAU } from 'src/admin/user/entities/mau.entity';
import { convertSolarToLunarDate } from 'src/common/utils/convertSolarToLunarDate.function';
import { DailyEmotion } from 'src/daily-emotion/entities/daily-emotion.entity';
import { FamilyPediaProfilePhoto } from 'src/family-pedia/entities/family-pedia-profile-photo.entity';
import { FamilyPedia } from 'src/family-pedia/entities/family-pedia.entity';
import { Family } from 'src/family/entities/family.entity';
import { Letter } from 'src/letter/entities/letter.entity';
import { MessageComment } from 'src/message/entities/message-comment.entity';
import { MessageFamily } from 'src/message/entities/message-family.entity';
import { Message } from 'src/message/entities/message.entity';
import { PhotoComment } from 'src/photo/entities/photo-comment.entity';
import { PhotoFile } from 'src/photo/entities/photo-file.entity';
import { Photo } from 'src/photo/entities/photo.entity';
import { S3Service } from 'src/s3/s3.service';
import { NotificationType } from 'src/sqs-notification/constants/notification-type';
import { SqsNotificationReqDTO } from 'src/sqs-notification/dto/sqs-notification-req.dto';
import { UserStatus } from 'src/user/constants/user-status.enum';
import { UserAuth } from 'src/user/entities/user-auth.entity';
import { User } from 'src/user/entities/user.entity';
import { Brackets, DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class SchedulerService {
  private logger = new Logger('Scheduler');

  constructor(
    private readonly sqsNotificationService: SqsNotificationService,
    private readonly s3Service: S3Service,
    @InjectDataSource() private dataSource: DataSource,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(UserAuth)
    private userAuthRepository: Repository<UserAuth>,
    @InjectRepository(Family) private familyRepository: Repository<Family>,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    @InjectRepository(MessageFamily)
    private messageFamRepository: Repository<MessageFamily>,
    @InjectRepository(Letter) private letterRepository: Repository<Letter>,
    @InjectRepository(DAU) private dauRepository: Repository<DAU>,
    @InjectRepository(MAU) private mauRepository: Repository<MAU>,
  ) {}

  @Cron('0 0 12 * * *', { timeZone: process.env.TZ })
  async sendMessageToday(): Promise<void> {
    const BATCH_ITEMS_COUNT = 500;
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const today = new Date(
        new Date('2023-10-20').toLocaleDateString('ko-KR'),
      ); // for test
      //   const today = new Date(new Date().toLocaleDateString('ko-KR'));
      const tomorrow = new Date(today.getTime() + 1000 * 60 * 60 * 24);

      // 1. message 검색
      const messageToSend = await queryRunner.manager
        .createQueryBuilder(Message, 'msg')
        .select('msg.id')
        .where('uploadAt >= :today', { today })
        .andWhere('uploadAt < :tomorrow', { tomorrow })
        .getOneOrFail();

      // 2. messageFamily 검색
      const familiesToSend = await queryRunner.manager
        .createQueryBuilder(Family, 'family')
        .select('family.id')
        .leftJoin(
          'family.messages',
          'messageFam',
          'messageFam.receiveDate >= :today and messageFam.receiveDate < :tomorrow',
          { today, tomorrow },
        )
        .where('messageFam.id IS NULL')
        .getMany();

      // 3. messageFamily builk insert (500명 단위 Batch로 나눠서 insert 및 FCM request)
      for (
        let i = 0;
        i < Math.ceil(familiesToSend.length / BATCH_ITEMS_COUNT);
        i++
      ) {
        const familiesByBatch = familiesToSend.slice(
          BATCH_ITEMS_COUNT * i,
          BATCH_ITEMS_COUNT * (i + 1),
        );

        const insertValues: QueryDeepPartialEntity<MessageFamily>[] =
          familiesByBatch.map((family) => ({
            receivedAt: new Date(),
            message: { id: messageToSend.id },
            family: { id: family.id },
          }));

        const insertResult = await queryRunner.manager
          .createQueryBuilder(MessageFamily, 'msgFam')
          .insert()
          .values(insertValues)
          .updateEntity(false)
          .execute();

        insertResult.raw?.affectedRows === 0
          ? this.logger.error('No messagefamilies inserted.', insertResult)
          : console.log(insertResult);

        // 4. 알림: sqs notif 요청
        const sqsDTO = new SqsNotificationReqDTO(
          NotificationType.MESSAGE_TODAY,
          { familyIds: familiesByBatch.map((f) => f.id) },
        );

        this.sqsNotificationService.sendNotification(sqsDTO);
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      this.logger.error(e.message);
    } finally {
      await queryRunner.release();
    }
  }

  @Cron('0 0 8 * * *', { timeZone: process.env.TZ })
  async sendBirthMessage(): Promise<void> {
    const BATCH_ITEMS_COUNT = 500;
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const todaySolar = new Date(new Date().toLocaleDateString('ko-KR'));
      const todayLunar = await convertSolarToLunarDate(todaySolar);

      // 1. 생일인 user 찾기
      const query = queryRunner.manager
        .createQueryBuilder(User, 'user')
        .select('user.familyId')
        .addSelect('MIN(user.id)')
        .where(
          new Brackets((qb) => {
            qb.where('isBirthLunar = false')
              .andWhere('MONTH(birthday) = :todaySolarMonth', {
                todaySolarMonth: todaySolar.getMonth() + 1,
              })
              .andWhere('DAY(birthday) = :todaySolarDay', {
                todaySolarDay: todaySolar.getDate(),
              });
          }),
        );

      if (todayLunar instanceof Date && !isNaN(todayLunar.getTime())) {
        query.orWhere(
          new Brackets((qb) => {
            qb.where('isBirthLunar = true')
              .andWhere('MONTH(birthday) = :todayLunarMonth', {
                todayLunarMonth: todayLunar.getMonth() + 1,
              })
              .andWhere('DAY(birthday) = :todayLunarDay', {
                todayLunarDay: todayLunar.getDate(),
              });
          }),
        );
      }

      const familyHasBirthday = await query.groupBy('user.familyId').getMany();

      // 2. user.familyId에 랜덤 생일 메세지 보내기
      const BIRTHDAY_MESSAGE_BASE_ID = 301; // 설정된 생일 축하 메세지: 301 ~ 304

      for (
        let i = 0;
        i < Math.ceil(familyHasBirthday.length / BATCH_ITEMS_COUNT);
        i++
      ) {
        const familyByBatch = familyHasBirthday.slice(
          BATCH_ITEMS_COUNT * i,
          BATCH_ITEMS_COUNT * (i + 1),
        );

        const insertValues: QueryDeepPartialEntity<MessageFamily>[] =
          familyByBatch.map((user) => ({
            message: { id: BIRTHDAY_MESSAGE_BASE_ID + (user.id % 4) },
            family: { id: user.familyId },
            receivedAt: new Date(),
          }));

        await queryRunner.manager
          .createQueryBuilder(MessageFamily, 'msgFam')
          .insert()
          .values(insertValues)
          .updateEntity(false)
          .execute();

        // 3. 알림: sqs notif 요청
        const sqsDTO = new SqsNotificationReqDTO(
          NotificationType.MESSAGE_BIRTHDAY,
          { familyIds: familyByBatch.map((user) => user.familyId) },
        );

        this.sqsNotificationService.sendNotification(sqsDTO);
      }
      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      this.logger.error(e.message);
    } finally {
      await queryRunner.release();
    }
  }

  @Cron('0 0 20 * * *', { timeZone: process.env.TZ })
  async notifyBirth(): Promise<void> {
    const oneDay = 1000 * 60 * 60 * 24;
    const todaySolar = new Date(new Date().toLocaleDateString('ko-KR'));

    const tomorrowSolar = new Date(todaySolar.getTime() + oneDay);
    const threeDaysLaterSolar = new Date(todaySolar.getTime() + oneDay * 3);

    const [tomorrowLunar, threeDaysLaterLunar] = await Promise.all(
      [tomorrowSolar, threeDaysLaterSolar].map((date) =>
        convertSolarToLunarDate(date),
      ),
    );

    // 1. 생일인 user, 그리고 그 family에 속하는 검색 (join, subquery)
    const query = this.userRepository
      .createQueryBuilder('user')
      .select('user.id')
      .addSelect('user.familyId')
      .where(
        new Brackets((qb) => {
          qb.where('isBirthLunar = false')
            .andWhere('MONTH(birthday) = :tomorrowSolarMonth', {
              tomorrowSolarMonth: tomorrowSolar.getMonth() + 1,
            })
            .andWhere('DAY(birthday) = :tomorrowSolarDay', {
              tomorrowSolarDay: tomorrowSolar.getDate(),
            });
        }),
      );

    query.orWhere(
      new Brackets((qb) => {
        qb.where('isBirthLunar = false')
          .andWhere('MONTH(birthday) = :threeDaysLaterSolarMonth', {
            threeDaysLaterSolarMonth: threeDaysLaterSolar.getMonth() + 1,
          })
          .andWhere('DAY(birthday) = :threeDaysLaterSolarDay', {
            threeDaysLaterSolarDay: threeDaysLaterSolar.getDate(),
          });
      }),
    );

    if (tomorrowLunar instanceof Date && !isNaN(tomorrowLunar.getTime())) {
      query.orWhere(
        new Brackets((qb) => {
          qb.where('isBirthLunar = true')
            .andWhere('MONTH(birthday) = :tomorrowLunarMonth', {
              tomorrowLunarMonth: tomorrowLunar.getMonth() + 1,
            })
            .andWhere('DAY(birthday) = :tomorrowLunarDay', {
              tomorrowLunarDay: tomorrowLunar.getDate(),
            });
        }),
      );
    }

    if (
      threeDaysLaterLunar instanceof Date &&
      !isNaN(threeDaysLaterLunar.getTime())
    ) {
      query.orWhere(
        new Brackets((qb) => {
          qb.where('isBirthLunar = true')
            .andWhere('MONTH(birthday) = :threeDaysLaterLunarMonth', {
              threeDaysLaterLunarMonth: threeDaysLaterLunar.getMonth() + 1,
            })
            .andWhere('DAY(birthday) = :threeDaysLaterLunarDay', {
              threeDaysLaterLunarDay: threeDaysLaterLunar.getDate(),
            });
        }),
      );
    }

    const usersOnBirthday = await query.getMany();

    // 2. 알림: sqs notif 요청
    const sqsDTO = new SqsNotificationReqDTO(NotificationType.NOTIFY_BIRTHDAY, {
      familyIdsWithBirthdayUserId: usersOnBirthday.map((user) => ({
        familyId: user.familyId,
        birthdayUserId: user.id,
      })),
    });

    this.sqsNotificationService.sendNotification(sqsDTO);
  }

  @Cron('0 * * * * *')
  async notifyTimeCapsuleOpened(): Promise<void> {
    const BATCH_ITEMS_COUNT = 250;

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 1000 * 60);

    // 1. letter 검색
    const timeCapsulesToNotify = await this.letterRepository
      .createQueryBuilder('letter')
      .select('letter.id')
      .addSelect('receiver.id')
      .addSelect('sender.id')
      .leftJoin('letter.receiver', 'receiver')
      .leftJoin('letter.sender', 'sender')
      .where('isTimeCapsule = true')
      .andWhere('isRead = false')
      .andWhere('isTemp = false')
      .andWhere('receiveDate > :oneMinuteAgo', { oneMinuteAgo })
      .andWhere('receiveDate <= :now', { now })
      .getMany();

    for (
      let i = 0;
      i < Math.ceil(timeCapsulesToNotify.length / BATCH_ITEMS_COUNT);
      i++
    ) {
      const lettersByBatch = timeCapsulesToNotify.slice(
        BATCH_ITEMS_COUNT * i,
        BATCH_ITEMS_COUNT * (i + 1),
      );

      // 2. 알림: sqs notif 요청
      const sqsDTO = new SqsNotificationReqDTO(
        NotificationType.TIMECAPSULE_OPEN,
        {
          timaCapsules: lettersByBatch.map((letter) => ({
            letterId: letter.id,
            receiverId: letter.receiver.id,
            senderId: letter.sender.id,
            familyId: letter.receiver.familyId,
          })),
        },
      );

      this.sqsNotificationService.sendNotification(sqsDTO);
    }
  }

  @Cron('0 59 23 * * *', { timeZone: process.env.TZ })
  async recordStat(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const today = new Date(new Date().toLocaleDateString('ko-KR'));
      const month = new Date(today.getTime() - 1000 * 60 * 60 * 24 * 30); // 30일 단위

      // 1. userAuth lastVisited 검색
      const dau = await queryRunner.manager
        .createQueryBuilder(UserAuth, 'userAuth')
        .select()
        .where('userAuth.updatedAt >= :today', { today })
        .getCount();

      const mau = await queryRunner.manager
        .createQueryBuilder(UserAuth, 'userAuth')
        .select()
        .where('userAuth.updatedAt >= :month', { month })
        .getCount();

      // 2. dau, mau repository에 저장
      await queryRunner.manager
        .createQueryBuilder(DAU, 'dau')
        .insert()
        .values({ date: today, count: dau })
        .updateEntity(false)
        .execute();

      await queryRunner.manager
        .createQueryBuilder(MAU, 'mau')
        .insert()
        .values({ date: today, count: mau })
        .updateEntity(false)
        .execute();

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'Error occurred while getting active users statistics.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  @Cron('0 0 2 * * *', { timeZone: process.env.TZ })
  async removeEmptyFamily(): Promise<void> {
    this.logger.log('scheduler invoked: [ removeEmptyFamily ]');

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const membersCountAlias = 'membersCount';

      const familyWithNoMembers = await queryRunner.manager
        .createQueryBuilder(Family, 'family')
        .select()
        .addSelect('COUNT(user.id)', membersCountAlias)
        .leftJoin('family.users', 'user')
        .groupBy('family.id')
        .having(`${membersCountAlias} = 0`)
        .getMany();

      if (familyWithNoMembers.length === 0) {
        return;
      }

      const deleteResult = await queryRunner.manager
        .createQueryBuilder(Family, 'family')
        .delete()
        .where('family.id IN (:...tgtFamilies)', {
          tgtFamilies: familyWithNoMembers.map((fam) => fam.id),
        })
        .execute();

      if (deleteResult.affected < 1) {
        throw new Error(
          "Couldn't remove families with no members even those exist.",
        );
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Removed ${familyWithNoMembers.length} families with no members.`,
      );
    } catch (e) {
      await queryRunner.rollbackTransaction();
      this.logger.error(e);
    } finally {
      await queryRunner.release();
    }
  }

  /*
    탈퇴 유저 배치 처리
    - 엔티티 개수가 많은 comment, s3 삭제를 동반하는 image(file) related entity 삭제는 cascade 하지 않고 별도로 진행
    - 이외는 부모 테이블 삭제시 onDelete Cascade 활용
    - 한 번에 너무 많은 update, delete 적용되지 않도록 적절히 배치 단위 조정

    새벽 스케쥴링 시간
    - remove empty family (db 작업 없음)
    - daily emotion: 2:15AM
    - pedia profile photo: 2:30AM
    - pedia: 2:45AM
    - photo file: 3:00AM
    - photo: 3:15AM
    - photo comment: 3:30AM
    - message comment: 3:45AM
    - user: 4:00AM
  */

  /**
   * pedia, photo, photo comment, message comment, daily emotion 제외 onDelete cascade
   * - 해당: photo like, message keep
   */
  @Cron('0 0 4 * * *', { timeZone: process.env.TZ })
  private async deleteUser(): Promise<void> {
    this.logger.log('scheduler invoked: [ deleteUser ]');

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const BATCH_SIZE = 20; // onDelete cacade로 인해 batch size 작게 설정

    try {
      const before60days = new Date(Date.now() - 1000 * 60 * 60 * 24 * 60);

      const userQueryBuilder = queryRunner.manager.createQueryBuilder(
        User,
        'user',
      );
      const usersWithdrawn = await this.getUsersWithdrawn(
        userQueryBuilder,
        before60days,
        true,
      );

      for (let i = 0; i < Math.ceil(usersWithdrawn.length / BATCH_SIZE); i++) {
        const currentTgts = usersWithdrawn.slice(
          BATCH_SIZE * i,
          BATCH_SIZE * (i + 1),
        );

        const deleteResult = await queryRunner.manager
          .createQueryBuilder(User, 'user')
          .delete()
          .where('user.id IN (:...tgtIds)', {
            tgtIds: currentTgts.map((tgt) => tgt.id),
          })
          .execute();

        if (deleteResult.affected !== currentTgts.length) {
          throw new Error('Some users are not removed from db.');
        }
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      this.logger.error(e);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  // 댓글 신고 검토를 위해 바로 삭제하지 않음 (사용자가 완전히 삭제되는 60일째에 같이 진행)
  @Cron('0 30 3 * * *', { timeZone: process.env.TZ })
  private async deletePhotoComment(): Promise<void> {
    this.logger.log('scheduler invoked: [ deletePhotoComment ]');

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const BATCH_SIZE = 100;

    try {
      const before60days = new Date(Date.now() - 1000 * 60 * 60 * 24 * 60);

      const userQueryBuilder = queryRunner.manager.createQueryBuilder(
        User,
        'user',
      );
      const usersWithdrawn = await this.getUsersWithdrawn(
        userQueryBuilder,
        before60days,
        true,
      );

      const comments = await queryRunner.manager
        .createQueryBuilder(PhotoComment, 'comment')
        .select('comment.id')
        .where('comment.authorId IN (:...targetUserIds)', {
          targetUserIds: usersWithdrawn.map((user) => user.id),
        })
        .getMany();

      for (let i = 0; i < Math.ceil(comments.length / BATCH_SIZE); i++) {
        const currentTgts = comments.slice(
          BATCH_SIZE * i,
          BATCH_SIZE * (i + 1),
        );

        const deleteResult = await queryRunner.manager
          .createQueryBuilder(PhotoComment, 'comment')
          .delete()
          .where('comment.id IN (:...tgtIds)', {
            tgtIds: currentTgts.map((tgt) => tgt.id),
          })
          .execute();

        if (deleteResult.affected !== currentTgts.length) {
          throw new Error('Some photo comments are not removed from db.');
        }
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      this.logger.error(e);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  // 댓글 신고 검토를 위해 바로 삭제하지 않음 (사용자가 완전히 삭제되는 60일째에 같이 진행)
  @Cron('0 45 3 * * *', { timeZone: process.env.TZ })
  private async deleteMessageComment(): Promise<void> {
    this.logger.log('scheduler invoked: [ deleteMessageComment ]');

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const BATCH_SIZE = 100;

    try {
      const before60days = new Date(Date.now() - 1000 * 60 * 60 * 24 * 60);

      const userQueryBuilder = queryRunner.manager.createQueryBuilder(
        User,
        'user',
      );
      const usersWithdrawn = await this.getUsersWithdrawn(
        userQueryBuilder,
        before60days,
        true,
      );

      const comments = await queryRunner.manager
        .createQueryBuilder(MessageComment, 'comment')
        .select('comment.id')
        .where('comment.authorId IN (:...targetUserIds)', {
          targetUserIds: usersWithdrawn.map((user) => user.id),
        })
        .getMany();

      for (let i = 0; i < Math.ceil(comments.length / BATCH_SIZE); i++) {
        const currentTgts = comments.slice(
          BATCH_SIZE * i,
          BATCH_SIZE * (i + 1),
        );

        const deleteResult = await queryRunner.manager
          .createQueryBuilder(MessageComment, 'comment')
          .delete()
          .where('comment.id IN (:...tgtIds)', {
            tgtIds: currentTgts.map((tgt) => tgt.id),
          })
          .execute();

        if (deleteResult.affected !== currentTgts.length) {
          throw new Error('Some message comments are not removed from db.');
        }
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      this.logger.error(e);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  @Cron('0 15 2 * * *', { timeZone: process.env.TZ })
  private async deleteEmotion(): Promise<void> {
    this.logger.log('scheduler invoked: [ deleteEmotion ]');

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const BATCH_SIZE = 100;

    try {
      const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24);

      const userQueryBuilder = queryRunner.manager.createQueryBuilder(
        User,
        'user',
      );
      const usersWithdrawn = await this.getUsersWithdrawn(
        userQueryBuilder,
        yesterday,
      );

      const comments = await queryRunner.manager
        .createQueryBuilder(DailyEmotion, 'emotion')
        .select('emotion.userId')
        .addSelect('emotion.date')
        .where('emotion.userId IN (:...targetUserIds)', {
          targetUserIds: usersWithdrawn.map((user) => user.id),
        })
        .getMany();

      for (let i = 0; i < Math.ceil(comments.length / BATCH_SIZE); i++) {
        const currentTgts = comments.slice(
          BATCH_SIZE * i,
          BATCH_SIZE * (i + 1),
        );

        // for composite key
        const tgtIds = currentTgts
          .map((tgt) => `(${tgt.userId}, "${tgt.date.toISOString()}")`)
          .join(',');

        const deleteResult = await queryRunner.manager
          .createQueryBuilder(DailyEmotion, 'emotion')
          .delete()
          .where(`(emotion.userId, emotion.date) IN (${tgtIds})`)
          .execute();

        if (deleteResult.affected !== currentTgts.length) {
          throw new Error('Some message comments are not removed from db.');
        }
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      this.logger.error(e);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  @Cron('0 30 2 * * *', { timeZone: process.env.TZ })
  private async deletePediaProfilePhoto(): Promise<void> {
    this.logger.log('scheduler invoked: [ deletePediaProfilePhoto ]');

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const BATCH_SIZE = 100;

    try {
      const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24);

      const userQueryBuilder = queryRunner.manager.createQueryBuilder(
        User,
        'user',
      );
      const usersWithdrawn = await this.getUsersWithdrawn(
        userQueryBuilder,
        yesterday,
      );

      const pediaPhotoFiles = await queryRunner.manager
        .createQueryBuilder(FamilyPediaProfilePhoto, 'photo')
        .select('photo.id')
        .addSelect('photo.url')
        .innerJoin(
          'photo.familyPedia',
          'pedia',
          'pedia.ownerId IN (:...targetUserIds)',
          { targetUserIds: usersWithdrawn.map((user) => user.id) },
        )
        .getMany();

      // iterate each batch
      for (let i = 0; i < Math.ceil(pediaPhotoFiles.length / BATCH_SIZE); i++) {
        const currentTgts = pediaPhotoFiles.slice(
          BATCH_SIZE * i,
          BATCH_SIZE * (i + 1),
        );

        const s3Result = await this.s3Service.deleteFiles(
          currentTgts.map((tgt) => tgt.url),
        );

        if (!s3Result.result) {
          throw new Error(s3Result.error);
        }

        const deleteResult = await queryRunner.manager
          .createQueryBuilder(FamilyPediaProfilePhoto, 'photo')
          .delete()
          .where('photo.id IN (:...tgtIds)', {
            tgtIds: currentTgts.map((tgt) => tgt.id),
          })
          .execute();

        if (deleteResult.affected !== currentTgts.length) {
          throw new Error(
            'Some pedia-photos are not removed from db. (c.f. removed from S3)',
          );
        }
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      this.logger.error(e);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  // onDelete Cascade로 question도 함께 삭제
  @Cron('0 45 2 * * *', { timeZone: process.env.TZ })
  private async deletePedia(): Promise<void> {
    this.logger.log('scheduler invoked: [ deletePedia ]');

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const BATCH_SIZE = 30; // cascade option 때문에 조금 더 작게 잡음

    try {
      const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24);

      const userQueryBuilder = queryRunner.manager.createQueryBuilder(
        User,
        'user',
      );
      const usersWithdrawn = await this.getUsersWithdrawn(
        userQueryBuilder,
        yesterday,
      );

      const pedias = await queryRunner.manager
        .createQueryBuilder(FamilyPedia, 'pedia')
        .select('pedia.ownerId')
        .where('pedia.ownerId IN (:...targetUserIds)', {
          targetUserIds: usersWithdrawn.map((user) => user.id),
        })
        .getMany();

      // iterate each batch
      for (let i = 0; i < Math.ceil(pedias.length / BATCH_SIZE); i++) {
        const currentTgts = pedias.slice(BATCH_SIZE * i, BATCH_SIZE * (i + 1));

        const deleteResult = await queryRunner.manager
          .createQueryBuilder(FamilyPedia, 'pedia')
          .delete()
          .where('pedia.ownerId IN (:...tgtIds)', {
            tgtIds: currentTgts.map((tgt) => tgt.ownerId),
          })
          .execute();

        if (deleteResult.affected !== currentTgts.length) {
          throw new Error('Some pedias are not removed from db.');
        }
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      this.logger.error(e);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  @Cron('0 0 3 * * *', { timeZone: process.env.TZ })
  private async deletePhotoFile(): Promise<void> {
    this.logger.log('scheduler invoked: [ deletePhotoFile ]');

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const BATCH_SIZE = 100;

    try {
      const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24);

      const userQueryBuilder = queryRunner.manager.createQueryBuilder(
        User,
        'user',
      );
      const usersWithdrawn = await this.getUsersWithdrawn(
        userQueryBuilder,
        yesterday,
      );

      const photoFiles = await queryRunner.manager
        .createQueryBuilder(PhotoFile, 'file')
        .select('file.id')
        .addSelect('file.url')
        .innerJoin(
          'file.photo',
          'photo',
          'photo.authorId IN (:...targetUserIds)',
          { targetUserIds: usersWithdrawn.map((user) => user.id) },
        )
        .getMany();

      // iterate each batch
      for (let i = 0; i < Math.ceil(photoFiles.length / BATCH_SIZE); i++) {
        const currentTgts = photoFiles.slice(
          BATCH_SIZE * i,
          BATCH_SIZE * (i + 1),
        );

        const s3Result = await this.s3Service.deleteFiles(
          currentTgts.map((tgt) => tgt.url),
        );

        if (!s3Result.result) {
          throw new Error(s3Result.error);
        }

        const deleteResult = await queryRunner.manager
          .createQueryBuilder(PhotoFile, 'file')
          .delete()
          .where('file.id IN (:...tgtIds)', {
            tgtIds: currentTgts.map((tgt) => tgt.id),
          })
          .execute();

        if (deleteResult.affected !== currentTgts.length) {
          throw new Error(
            'Some files are not removed from db. (c.f. removed from S3)',
          );
        }
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      this.logger.error(e);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  @Cron('0 15 3 * * *', { timeZone: process.env.TZ })
  private async deletePhoto(): Promise<void> {
    this.logger.log('scheduler invoked: [ deletePhoto ]');

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const BATCH_SIZE = 100;

    try {
      const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24);

      const userQueryBuilder = queryRunner.manager.createQueryBuilder(
        User,
        'user',
      );
      const usersWithdrawn = await this.getUsersWithdrawn(
        userQueryBuilder,
        yesterday,
      );

      const photos = await queryRunner.manager
        .createQueryBuilder(Photo, 'photo')
        .select('photo.id')
        .where('photo.authorId IN (:...targetUserIds)', {
          targetUserIds: usersWithdrawn.map((user) => user.id),
        })
        .getMany();

      // iterate each batch
      for (let i = 0; i < Math.ceil(photos.length / BATCH_SIZE); i++) {
        const currentTgts = photos.slice(BATCH_SIZE * i, BATCH_SIZE * (i + 1));

        const deleteResult = await queryRunner.manager
          .createQueryBuilder(Photo, 'photo')
          .delete()
          .where('photo.id IN (:...tgtIds)', {
            tgtIds: currentTgts.map((tgt) => tgt.id),
          })
          .execute();

        if (deleteResult.affected !== currentTgts.length) {
          throw new Error('Some photos are not removed from db.');
        }
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      this.logger.error(e);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  private async getUsersWithdrawn(
    userQueryBuilder: SelectQueryBuilder<User>,
    targetDate: Date,
    before = false,
  ): Promise<User[]> {
    const query = userQueryBuilder
      .select('id')
      .where('status = :status', { status: UserStatus.DELETED });

    before
      ? query.andWhere('updatedAt < :targetDate', { targetDate })
      : query.andWhere('updatedAt > :targetDate', { targetDate });

    const usersWithdrawn = await query.getMany();

    return usersWithdrawn;
  }
}

import { SqsNotificationService } from './../sqs-notification/sqs-notification.service';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DAU } from 'src/admin/entities/dau.entity';
import { MAU } from 'src/admin/entities/mau.entity';
import { convertSolarToLunarDate } from 'src/common/utils/convertSolarToLunarDate.function';
import { Family } from 'src/family/entities/family.entity';
import { Letter } from 'src/letter/entities/letter.entity';
import { MessageFamily } from 'src/message/entities/message-family.entity';
import { Message } from 'src/message/entities/message.entity';
import { NotificationType } from 'src/sqs-notification/constants/notification-type';
import { SqsNotificationProduceDTO } from 'src/sqs-notification/dto/sqs-notification-produce.dto';
import { UserAuth } from 'src/user/entities/user-auth.entity';
import { User } from 'src/user/entities/user.entity';
import { Brackets, DataSource, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class SchedulerService {
  constructor(
    private readonly sqsNotificationService: SqsNotificationService,
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
      const messageToSend = await this.messageRepository
        .createQueryBuilder('msg')
        .select('msg.id')
        .where('uploadAt >= :today', { today })
        .andWhere('uploadAt < :tomorrow', { tomorrow })
        .getOneOrFail();

      // 2. messageFamily 검색
      const familiesToSend = await this.familyRepository
        .createQueryBuilder('family')
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

        const insertResult = await this.messageFamRepository
          .createQueryBuilder('msgFam')
          .insert()
          .into(MessageFamily)
          .values(insertValues)
          .updateEntity(false)
          .execute();

        insertResult.raw?.affectedRows === 0
          ? console.error('No messagefamilies inserted.', insertResult)
          : console.log(insertResult);

        // 4. 알림: sqs notif 요청
        const sqsDTO = new SqsNotificationProduceDTO(
          NotificationType.MESSAGE_TODAY,
          { familyIds: familiesByBatch.map((f) => f.id) },
        );

        this.sqsNotificationService.sendNotification(sqsDTO);
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.error(e.message);
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

      // TODO: distinct family test

      // 1. 생일인 user 찾기
      const query = this.userRepository
        .createQueryBuilder('user')
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

      // TODO: group by로 distinct 역할 수행 확인
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

        const insertResult = await this.messageFamRepository
          .createQueryBuilder('msgFam')
          .insert()
          .into(MessageFamily)
          .values(insertValues)
          .updateEntity(false)
          .execute();

        // 3. 알림: sqs notif 요청
        const sqsDTO = new SqsNotificationProduceDTO(
          NotificationType.MESSAGE_BIRTHDAY,
          { familyIds: familyByBatch.map((user) => user.familyId) },
        );

        this.sqsNotificationService.sendNotification(sqsDTO);
      }
      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.error(e.message);
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
    const sqsDTO = new SqsNotificationProduceDTO(
      NotificationType.NOTIFY_BIRTHDAY,
      {
        familyIdsWithBirthdayUserId: usersOnBirthday.map((user) => ({
          familyId: user.familyId,
          birthdayUserId: user.id,
        })),
      },
    );

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
      const sqsDTO = new SqsNotificationProduceDTO(
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
      const dau = await this.userAuthRepository
        .createQueryBuilder('userAuth')
        .select()
        .where('userAuth.updatedAt >= :today', { today })
        .getCount();

      const mau = await this.userAuthRepository
        .createQueryBuilder('userAuth')
        .select()
        .where('userAuth.updatedAt >= :month', { month })
        .getCount();

      // 2. dau, mau repository에 저장
      await this.dauRepository
        .createQueryBuilder('dau')
        .insert()
        .into(DAU)
        .values({ date: today, count: dau })
        .updateEntity(false)
        .execute();

      await this.mauRepository
        .createQueryBuilder('mau')
        .insert()
        .into(MAU)
        .values({ date: today, count: mau })
        .updateEntity(false)
        .execute();

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.error('Error occurred while getting active users statistics.');
    } finally {
      await queryRunner.release();
    }
  }
}

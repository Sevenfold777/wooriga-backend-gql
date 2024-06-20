import { UserWithStat } from './../dto/user-with-stat.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationReqDTO } from 'src/common/dto/pagination-req.dto';
import { UserStatus } from 'src/user/constants/user-status.enum';
import { UserAuth } from 'src/user/entities/user-auth.entity';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { CountResDTO } from '../dto/count-res.dto';
import { DauListResDTO } from '../dto/dau-list-res.dto';
import { MauListResDTO } from '../dto/mau-list-res.dto';
import { DAU } from './entities/dau.entity';
import { MAU } from './entities/mau.entity';
import { MessageComment } from 'src/message/entities/message-comment.entity';
import { Letter } from 'src/letter/entities/letter.entity';
import { Photo } from 'src/photo/entities/photo.entity';
import { PhotoComment } from 'src/photo/entities/photo-comment.entity';
import { DailyEmotion } from 'src/daily-emotion/entities/daily-emotion.entity';
import { UserDetailsResDTO } from '../dto/user-details-res.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(DAU) private readonly dauRepository: Repository<DAU>,
    @InjectRepository(MAU) private readonly mauRepository: Repository<MAU>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserAuth)
    private readonly userAuthRepository: Repository<UserAuth>,
  ) {}

  async getUsersCount(): Promise<CountResDTO> {
    try {
      const usersCount = await this.userRepository
        .createQueryBuilder('user')
        .where('user.status = :status', { status: UserStatus.ACTIVE })
        .getCount();

      return { result: true, count: usersCount };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getUsersDetails({
    take,
    prev,
  }: PaginationReqDTO): Promise<UserDetailsResDTO> {
    try {
      const msgCommentCountAlias = 'msgCommentCount';
      const letterSentCountAlias = 'letterSentCount';
      const photoCountAlias = 'photoCount';
      const photoCommentCountAlias = 'photoCommentCount';
      const emotionCountAlias = 'emotionCount';

      const { raw: usersRaw, entities: userEntities } =
        await this.userRepository
          .createQueryBuilder('user')
          .select()
          .addSelect('IFNULL(msgCommentCount.count, 0)', msgCommentCountAlias)
          .addSelect('IFNULL(letterSentCount.count, 0)', letterSentCountAlias)
          .addSelect('IFNULL(photoCount.count, 0)', photoCountAlias)
          .addSelect(
            'IFNULL(photoCommentCount.count, 0)',
            photoCommentCountAlias,
          )
          .addSelect('IFNULL(emotionCount.count, 0)', emotionCountAlias)
          .innerJoinAndSelect('user.userAuth', 'auth')
          .leftJoin(
            (qb) =>
              qb
                .select('msgComment.authorId', 'authorId')
                .addSelect('COUNT(msgComment.id)', 'count')
                .from(MessageComment, 'msgComment')
                .groupBy('msgComment.authorId'),
            'msgCommentCount',
            'msgCommentCount.authorId = user.id',
          )
          .leftJoin(
            (qb) =>
              qb
                .select('letter.senderId', 'senderId')
                .addSelect('COUNT(letter.id)', 'count')
                .from(Letter, 'letter')
                .groupBy('letter.senderId'),
            'letterSentCount',
            'letterSentCount.senderId = user.id',
          )
          .leftJoin(
            (qb) =>
              qb
                .select('photo.authorId', 'authorId')
                .addSelect('COUNT(photo.id)', 'count')
                .from(Photo, 'photo')
                .groupBy('photo.authorId'),
            'photoCount',
            'photoCount.authorId = user.id',
          )
          .leftJoin(
            (qb) =>
              qb
                .select('photoComment.authorId', 'authorId')
                .addSelect('COUNT(photoComment.id)', 'count')
                .from(PhotoComment, 'photoComment')
                .groupBy('photoComment.authorId'),
            'photoCommentCount',
            'photoCommentCount.authorId = user.id',
          )
          .leftJoin(
            (qb) =>
              qb
                .select('emotion.userId', 'userId')
                .addSelect('COUNT(emotion.id)', 'count')
                .from(DailyEmotion, 'emotion')
                .groupBy('emotion.userId'),
            'emotionCount',
            'emotionCount.userId = user.id',
          )
          .orderBy('user.id', 'DESC')
          .offset(take * prev)
          .limit(take)
          .getRawAndEntities();

      const userDetails: UserWithStat[] = [];

      for (let i = 0; i < userEntities.length; i++) {
        const userDetail = new UserWithStat();

        Object.assign(userDetail, userEntities[i]);
        userDetail.messageCommentCount = usersRaw[i][msgCommentCountAlias];
        userDetail.letterSentCount = usersRaw[i][letterSentCountAlias];
        userDetail.photoCount = usersRaw[i][photoCountAlias];
        userDetail.photoCommentCount = usersRaw[i][photoCommentCountAlias];
        userDetail.emotionCount = usersRaw[i][emotionCountAlias];

        userDetails.push(userDetail);
      }

      return { result: true, userDetails };

      /* 
        join 매우 많은 쿼리, 최적화 필요
        일단 take를 너무 많이 가져 가지 않는 pagination으로 성능 하락 방어
        
        향후 방안 1. query 나눠서 전송 + batch load (=> 이것보다 지금 방식이 더욱 효율적)
        향후 방안 2. caching 또는, user_stat 테이블 만들어서 통계 기록하기
       */
      // 기존 단순 쿼리 방식 : local DB에 적용해도 약 30초 걸림
      //   const { raw: usersRaw, entities: userEntities } =
      //     await this.userRepository
      //       .createQueryBuilder('user')
      //       .select()
      //       .addSelect('COUNT(DISTINCT msgComment.id)', 'msgCommentCount')
      //       .addSelect('COUNT(DISTINCT letter.id)', 'letterCount')
      //       .addSelect('COUNT(DISTINCT photo.id)', 'photoCount')
      //       .addSelect('COUNT(DISTINCT photoComment.id)', 'photoCommentCount')
      //       .addSelect('COUNT(DISTINCT emotion.id)', 'emotionCount')
      //       .innerJoinAndSelect('user.userAuth', 'auth')
      //       .leftJoin(
      //         'message_family_comment',
      //         'msgComment',
      //         'msgComment.authorId = user.id',
      //       )
      //       .leftJoin('letter', 'letter', 'letter.senderId = user.id')
      //       .leftJoin('photo', 'photo', 'photo.authorId = user.id')
      //       .leftJoin(
      //         'photo_comment',
      //         'photoComment',
      //         'photoComment.authorId = user.id',
      //       )
      //       .leftJoin('daily_emotion', 'emotion', 'emotion.userId = user.id')
      //       .groupBy('user.id')
      //       .orderBy('user.id', 'DESC')
      //       .offset(take * prev)
      //       .limit(take)
      //       .getRawAndEntities();
      //   console.log({ usersRaw });
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getDau(): Promise<CountResDTO> {
    try {
      const mau = await this.mauRepository
        .createQueryBuilder('mau')
        .select('mau.count')
        .orderBy('date', 'DESC')
        .getOneOrFail();

      return { result: true, count: mau.count };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getMau(): Promise<CountResDTO> {
    try {
      const dau = await this.dauRepository
        .createQueryBuilder('dau')
        .select('dau.count')
        .orderBy('date', 'DESC')
        .getOneOrFail();

      return { result: true, count: dau.count };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getDauHistory({
    take,
    prev,
  }: PaginationReqDTO): Promise<DauListResDTO> {
    try {
      const dauList = await this.dauRepository
        .createQueryBuilder('dau')
        .select()
        .orderBy('date', 'DESC')
        .offset(take * prev)
        .limit(take)
        .getMany();

      return { result: true, dauList };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  async getMauHistory({
    take,
    prev,
  }: PaginationReqDTO): Promise<MauListResDTO> {
    try {
      const mauList = await this.mauRepository
        .createQueryBuilder('mau')
        .select()
        .orderBy('date', 'DESC')
        .offset(take * prev)
        .limit(take)
        .getMany();

      return { result: true, mauList };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }
}

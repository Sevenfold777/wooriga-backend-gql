import { LetterBoxReqDTO } from './dto/letter-box-req.dto';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { EditLetterReqDTO } from './dto/edit-letter-req.dto';
import { LetterReqDTO } from './dto/letter-req.dto';
import { SendLetterReqDTO } from './dto/send-letter-req.dto';
import { LetterResDTO } from './dto/letter-res.dto';
import { LetterBoxResDTO } from './dto/letter-box-res.dto';
import { CreateResDTO } from 'src/common/dto/create-res.dto';
import { LetterType } from './constants/letter-type.enum';
import { LetterGuideResDTO } from './dto/letter-guide-res.dto';
import { EditLetterKeptReqDTO } from './dto/edit-letter-kept-req.dto';

export interface LetterService {
  sendLetter(
    user: AuthUserId,
    sendLetterReqDTO: SendLetterReqDTO,
  ): Promise<CreateResDTO>;

  readLetter(user: AuthUserId, id: number): Promise<BaseResponseDTO>;

  editLetter(
    user: AuthUserId,
    editLetterReqDTO: EditLetterReqDTO,
  ): Promise<BaseResponseDTO>;

  deleteLetter(user: AuthUserId, id: number): Promise<BaseResponseDTO>;

  /**
   * sendLetter에서는 가족한테만 보낼 수 있는지 확인하지만,
   * findLetter는 자신한테 온 편지는 전부 볼 수 있도록 sender 가족 체크 하지 않음
   * 가족이었다가 탈퇴한 회원, 가족을 바꾼 회원 등에게 받은 편지도 계속 확인할 수 있도록 정책 구성
   */
  findLetter(user: AuthUserId, reqDTO: LetterReqDTO): Promise<LetterResDTO>;

  findLetterBox(
    user: AuthUserId,
    reqDTO: LetterBoxReqDTO,
  ): Promise<LetterBoxResDTO>;

  findLetterAllBox(
    userId: number,
    type: LetterType,
    take: number,
    prev: number,
  ): Promise<LetterBoxResDTO>;

  findTimeCapsuleBox(
    userId: number,
    type: LetterType,
    take: number,
    prev: number,
  ): Promise<LetterBoxResDTO>;

  findLetterKeptBox(
    userId: number,
    type: LetterType,
    take: number,
    prev: number,
  ): Promise<LetterBoxResDTO>;

  editLetterKept(
    user: AuthUserId,
    reqDTO: EditLetterKeptReqDTO,
  ): Promise<BaseResponseDTO>;

  getLetterGuide(): Promise<LetterGuideResDTO>;
}

export const LetterService = Symbol('LetterService');

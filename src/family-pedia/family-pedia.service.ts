import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { CreateQuestionReqDTO } from './dto/create-question-req.dto';
import { EditQuestionReqDTO } from './dto/edit-question-req.dto';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { AnswerQuestionReqDTO } from './dto/answer-question-req.dto';
import { QueryRunner } from 'typeorm';
import { FamilyPediasResDTO } from './dto/family-pedias-res.dto';
import { FamilyPediaResDTO } from './dto/family-pedia-res.dto';
import { CreateResDTO } from 'src/common/dto/create-res.dto';
import { ProfilePhotoUploadCompletedReqDTO } from './dto/profile-photo-upload-completed-req.dto';
import { ProfilePhotosResDTO } from './dto/profile-photos-res.dto';
import { CreateProfilePhotoResDTO } from './dto/create-profile-photo-res.dto';

export interface FamilyPediaService {
  // 같은 가족이라면 사진을 수정할 수 있음
  createProfilePhoto(
    { familyId }: AuthUserId,
    pediaId: number,
  ): Promise<CreateProfilePhotoResDTO>;

  profilePhotoUploadCompleted(
    { userId, familyId }: AuthUserId,
    { pediaId, url, width, height }: ProfilePhotoUploadCompletedReqDTO,
  ): Promise<BaseResponseDTO>;

  findProfilePhotos(
    { familyId }: AuthUserId,
    pediaId: number,
  ): Promise<ProfilePhotosResDTO>;

  // 올리는 것은 여러 가족 사용자가 올릴 수 있지만, 삭제는 owner만 가능
  deleteProfilePhoto(
    { userId }: AuthUserId,
    photoId: number,
  ): Promise<BaseResponseDTO>;

  /*
    userService에 의해서만 호출됨, sign up user에서 query runner 받아옴
    transaction 역시 sign up에서 handle
  */
  createFamilyPedia(ownerId: number, queryRunner: QueryRunner): Promise<void>;

  findPedias({ userId, familyId }: AuthUserId): Promise<FamilyPediasResDTO>;

  findPedia({ familyId }: AuthUserId, id: number): Promise<FamilyPediaResDTO>;

  // transaction 하지 않음 => pediaFamValidate 포함 2회 db 접근 (아래 다른 메서드도 동일)
  createQuestion(
    { userId, familyId }: AuthUserId,
    { question, pediaId }: CreateQuestionReqDTO,
  ): Promise<CreateResDTO>;

  // iff 내가 한 질문에 아직 답장 안했을 경우
  editQuestion(
    { userId, familyId }: AuthUserId,
    { id, question, pediaId }: EditQuestionReqDTO,
  ): Promise<BaseResponseDTO>;

  // if 답장 안했을 경우 question 만든 사람 삭제 가능
  // if 피디아 주인이 삭제
  deleteQuestion(
    { userId, familyId }: AuthUserId,
    id: number,
  ): Promise<BaseResponseDTO>;

  answerQuestion(
    { userId, familyId }: AuthUserId,
    { id, answer }: AnswerQuestionReqDTO,
  ): Promise<BaseResponseDTO>;
}

export const FamilyPediaService = Symbol('FamilyPediaService');

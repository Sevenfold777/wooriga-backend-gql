import { AuthUser } from './../auth/decorators/auth-user.decorator';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { LetterService } from './letter.service';
import { AuthUserId } from 'src/auth/constants/auth-user-id.type';
import { BaseResponseDTO } from 'src/common/dto/base-res.dto';
import { SendLetterReqDTO } from './dto/send-letter-req.dto';
import { SendLetterResDTO } from './dto/send-letter-res.dto';
import { EditLetterReqDTO } from './dto/edit-letter-req.dto';
import { LetterReqDTO } from './dto/letter-req.dto';
import { Letter } from './entities/letter.entity';
import { LetterBoxReqDTO } from './dto/letter-box-req.dto';
import { LetterGuide } from './entities/letter-guide.entity';

@Resolver()
export class LetterResolver {
  constructor(private readonly letterService: LetterService) {}

  @Mutation(() => SendLetterResDTO)
  sendLetter(
    @AuthUser() user: AuthUserId,
    @Args('reqDTO') sendLetterReqDTO: SendLetterReqDTO,
  ): Promise<SendLetterResDTO> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  readLetter(
    @AuthUser() user: AuthUserId,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  editLetter(
    @AuthUser() user: AuthUserId,
    @Args('reqDTO') editLetterReqDTO: EditLetterReqDTO,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  deleteLetter(
    @AuthUser() user: AuthUserId,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  @Query(() => Letter)
  findLetter(
    @AuthUser() user: AuthUserId,
    @Args('reqDTO') letterReqDTO: LetterReqDTO,
  ): Promise<Letter> {
    return null;
  }

  @Query(() => [Letter])
  findLetterBox(
    @AuthUser() user: AuthUserId,
    @Args('reqDTO') letterBoxReqDTO: LetterBoxReqDTO,
  ): Promise<Letter[]> {
    return null;
  }

  @Query(() => [Letter])
  findKept(
    @AuthUser() user: AuthUserId,
    @Args('prev', { type: () => Int }) prev: number,
  ): Promise<Letter[]> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  keepLetter(
    @AuthUser() user: AuthUserId,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  @Mutation(() => BaseResponseDTO)
  unkeepLetter(
    @AuthUser() user: AuthUserId,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<BaseResponseDTO> {
    return null;
  }

  @Query(() => LetterGuide)
  getLetterGuide(): Promise<LetterGuide> {
    return null;
  }
}

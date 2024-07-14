import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { BaseResponseDTO } from './dto/base-res.dto';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const logger = new Logger('GRAPHQL');

    const gqlContext = GqlExecutionContext.create(context).getContext();
    const request = gqlContext.req;

    const ip = request.ip;
    const query = request.body.query;
    const user = JSON.stringify(request.user);

    // TODO: 모든 요청 로그 => 배포 초기만, 추후 설정 해제
    logger.log(`${user} - ${ip}\nQUERY REQUESTED: ${query}`);

    return next.handle().pipe(
      tap((data: BaseResponseDTO) => {
        /* 
            BaseResponse Type으로 return 되는 모든 error logging.
            트래픽 많아지면 로깅하지 않을 것 필터링 고민, 특히 사용자 에러
            그럼에도 지금은 빈번한 사용자 에러 확인 위해 로깅
          */
        if (data?.result === false) {
          logger.error(
            `${user} - ${ip}\nQUERY: ${query}\nError Message: ${data?.error}`,
          );
        }
      }),
    );
  }
}

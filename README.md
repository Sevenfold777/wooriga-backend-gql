# 우리가 Backend V2. (NestJS + GraphQL)

가족 소통 모바일 애플리케이션 [우리가](https://wool2ga.com)의 백엔드 시스템 개선 프로젝트로, 기존 v1.에서 메인 API 서버에 집중되는 부하와 책임을 분산하여 높은 성능과 자동화와 테스트를 통해 유지보수성을 가진 프로그램을 개발하기 위해 진행되었습니다.

구체적으로 GraphQL로의 전환, 이미지 업로드 프로세스 개선, [알림 시스템 분리](https://github.com/Sevenfold777/wooriga-notification-serverless.git), Jest e2e test 진행 등 다방면에서의 업데이트가 진행되었습니다. 알림 시스템은 Node.js Serverless 환경에서 개발되었으면 [해당 Repository](https://github.com/Sevenfold777/wooriga-notification-serverless.git)에서 구체적인 내용을 확인하실 수 있습니다.

우리가 서비스의 운영 과정 소개는 [링크](https://drive.google.com/file/d/12s9z8sV3VAMP1AbSgQ1zrNxBbQaFi-Z_/view?usp=sharing)에서 확인하실 수 있습니다.

## 목차

- [아키텍처 개요](#아키텍처-개요)

- [이미지 업로드 개선](#이미지-업로드-개선)

- [알림 시스템 분리](#알림-시스템-분리)

- [프로젝트 구조 설계와 일부 NestJS Event 적용](#프로젝트-구조-설계와-일부-nestjs-event-적용)

- [GraphQL 전환](#graphql-전환)

- [Custom Validator 적용 - Runtime Error 방지](#custom-validator--runtime-error-방지)

- [TypeORM Query Builder 도입](#typeorm-query-builder-도입)

- [Jest E2E Test](#jest-e2e-test)

## 아키텍처 개요

![woorgia_v2_architecture drawio](https://github.com/Sevenfold777/wooriga-backend-gql/assets/88102203/c47b272c-6691-4560-9c51-326071aa21e1)

## 이미지 업로드 개선

### 업데이트 전

- 개당 약 500~700KB의 파일에 대하여 최대 10개를 한 번의 POST 요청

- 메인 API 서버가 이미지 파일 수신, AWS SDK를 사용하여 S3에 업로드 후 DB에 metadata 등 저장

- 이러한 방식은 다른 모든 API를 처리해야하는 메인 서버 과중한 부담을 주고, 느린 업로드 속도로 좋지 않은 사용자 경험을 야기하므로 개선 필수적

### 업데이트 후

- `S3`의 `presigned url` 방식을 사용하여, 클라이언트가 이미지 업로드를 진행하도록 하여 부하 완화

  - 1. 서버는 요청에 따라 `presigned url`을 발급 받고 `upload = false` 인 `photo`와 `photo_file` Entity 생성, `presigned url` 응답

  - 2. 클라이언트는 `presigned url`을 사용하여 직접 이미지 업로드 완료 후 업로드 완료를 서버에 알림, 서버는 `upload = true` entity update, 새로운 사진 등록 완료 알림 전송

- `presigned url`의 짧은 유효기간과 암호화된 url 제공으로 보안 강화

- 흐름도

  ![presigned_url](https://github.com/Sevenfold777/wooriga-backend-gql/assets/88102203/1f51cb99-c898-4224-af74-2247ee14622d)

- [소스코드](https://github.com/Sevenfold777/wooriga-backend-gql/blob/3e8207b831a0440c2914701a85160f5946088aca/src/photo/photo.service.ts)

    <details>
    <summary>1. create photo</summary>

  ```typescript
  async createPhoto(
      { userId, familyId }: AuthUserId,
      { title, payload, filesCount }: CreatePhotoReqDTO,
  ): Promise<CreatePhotoResDTO> {
      const queryRunner = this.dataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
      if (filesCount <= 0) {
          throw new Error('At least one file to upload required.');
      }

      if (filesCount > 10) {
          throw new Error(
          'The number of files to upload should be less than 10.',
          );
      }

      // create photo Entity
      const photo = await queryRunner.manager
          .createQueryBuilder(Photo, 'photo')
          .insert()
          .values({
          title,
          payload,
          author: { id: userId },
          family: { id: familyId },
          })
          .updateEntity(false)
          .execute();

      const photoId = photo.raw?.insertId;

      // get presigned urls and create photoFile Entity
      const presignedUrlReqs: Promise<GetPresignedUrlResDTO>[] = [];

      for (let i = 0; i < filesCount; i++) {
          presignedUrlReqs.push(
          this.s3Service.getPresignedUrl({
              userId,
              dir: S3Directory.PHOTO,
              fileId: i,
              expiresIn: 60 * 5,
          }),
          );
      }
      const presignedUrlRes = await Promise.all(presignedUrlReqs);

      const filesToCreate: QueryDeepPartialEntity<PhotoFile>[] = [];

      presignedUrlRes.forEach((item) => {
          if (!item.result) {
          throw new Error('Error occurred during upload configuration.');
          }

          const endpoint = item.url
          .replace(/^(https?:\/\/[^\/]+\.com\/)/, '')
          .split('?')[0];

          filesToCreate.push({
          url: endpoint,
          photo: { id: photoId },
          uploaded: false,
          });
      });

      await queryRunner.manager
          .createQueryBuilder(PhotoFile, 'file')
          .insert()
          .into(PhotoFile)
          .values(filesToCreate)
          .execute();

      await queryRunner.commitTransaction();

      // 알림은 파일 업로드 완료 후 처리

      return {
          result: true,
          photoId,
          presignedUrls: presignedUrlRes.map((item) => item.url),
      };
      } catch (e) {
      await queryRunner.rollbackTransaction();
      return { result: false, error: e.message };
      } finally {
      await queryRunner.release();
      }
  }
  ```

    </details>

    <details>
    <summary>2. file upload completed</summary>

  ```typescript
  async fileUploadCompleted(
      { userId, familyId }: AuthUserId,
      { photoId, photofilesUploaded }: PhotoFileUploadCompletedReqDTO,
  ): Promise<BaseResponseDTO> {
      const queryRunner = this.dataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
      // validate if photo file exist
      const photo = await queryRunner.manager
          .createQueryBuilder(Photo, 'photo')
          .select('photo.id')
          .addSelect('photo.title')
          .where('photo.id = :photoId', { photoId })
          .andWhere('photo.familyId = :familyId', { familyId })
          .andWhere('photo.author.id = :userId', { userId })
          .getOneOrFail();

      const updatePromises = photofilesUploaded.map((item) => {
          // 엔드포인트만 넘겨 받는 게 규약이지만, 앱단에서 실수할 가능성 높기에 이중 필터
          const strippedUrl = item.url.replace(/^\.com\//, '').split('?')[0];

          return queryRunner.manager
          .createQueryBuilder(PhotoFile, 'file')
          .update()
          .where('photoId = :photoId', { photoId })
          .andWhere('url = :url', { url: strippedUrl })
          .set({ uploaded: true, width: item.width, height: item.height })
          .updateEntity(false)
          .execute();
      });

      // 전부 다 성공해야 함 (c.f. Promise.allSettled)
      const updateFileResults = await Promise.all(updatePromises);
      updateFileResults.forEach((res) => {
          if (res.affected !== 1) {
          throw new Error(
              `Cannot update some photo file entities' to uploaded.`,
          );
          }
      });

      const updatePhotoResult = await queryRunner.manager
          .createQueryBuilder(Photo, 'photo')
          .update()
          .where('id = :photoId', { photoId })
          .set({ uploaded: true })
          .updateEntity(true)
          .execute();

      if (updatePhotoResult.affected !== 1) {
          throw new Error("Cannot update the photo entity's status to uploaded.");
      }

      await queryRunner.commitTransaction();

      // 알림
      const titlePreview =
          photo.title.length > 10
          ? photo.title.slice(0, 10) + '...'
          : photo.title;

      const sqsDTO = new SqsNotificationReqDTO(NotificationType.PHOTO_CREATE, {
          photoId,
          familyId,
          authorId: userId,
          titlePreview,
      });

      this.sqsNotificationService.sendNotification(sqsDTO);

      return { result: true };
      } catch (e) {
      await queryRunner.rollbackTransaction();
      return { result: false, error: e.message };
      } finally {
      await queryRunner.release();
      }
  }
  ```

    </details>

## 알림 시스템 분리

### 업데이트 전

- 메인 서버가 알림 전송에 책임을 지고 user DB에 1회 이상 추가적으로 쿼리하여 fcmToken을 불러옴

- FCM 푸시 알림 전송 모듈이 메인 API 내에 존재하며 전송 책임

  ```typescript
  // ... photo comment 저장

  const familyMembers = await this.userRepository.find({
    select: ['fcmToken', 'id'],
    where: {
      status: Status.ACTIVE,
      family: { id: familyId },
      id: Not(userId),
      fcmToken: Not(''),
    },
  });

  // sendNotification은 내부적으로 FCM().sendMuticast 호출
  await this.notificationService.sendNotification({
    tokens: familyMembers.map((user) => user.fcmToken),
    title: '우리가 앨범',
    body: `우리 가족이 사진에 댓글을 작성했습니다. "${
      commmentPhotoInput.payload.length > 8
        ? commmentPhotoInput.payload.slice(0, 8) + '...'
        : commmentPhotoInput.payload
    }"`,
    screen: ROUTE_NAME.PHOTO,
    param: {
      photoId: id,
    },
    senderId: userId,
    receiversId: familyMembers.map((user) => user.id),
  });

  return { ok: true };
  ```

### 업데이트 후

- 아키텍처

  ![wooriga_notification drawio](https://github.com/Sevenfold777/wooriga-backend-gql/assets/88102203/965852a6-860a-4dcd-89d4-b818826da6f2)

- 분리된 `AWS Lambda` `Serverless` 알림 시스템에 user 데이터 쿼리 및 FCM 요청 책임 분리

  ```typescript
  // ... photo comment 저장

  const sqsDTO = new SqsNotificationReqDTO(NotificationType.COMMENT_PHOTO, {
    photoId,
    familyId,
    authorId: userId,
    commentPreview,
  });

  // SQS 전송 요청 Wrapper 호출
  this.sqsNotificationService.sendNotification(sqsDTO);

  return { result: true, id: commentId };
  ```

- `AWS FIFO SQS`를 통해 알림 전송에 대한 비동기 요청, 비즈니스 로직과 알림 시스템을 `Decouple`

  - 푸시 알림은 `DAU`와 직결되는 중요한 기능, `Message Queue`를 사용하여 알림 시스템 Fail에 따른 알림 누락 방지

  ```typescript
    async sendNotification(body: SqsNotificationReqDTO<NotificationType>) {
        try {
            const command = new SendMessageCommand({
                DelaySeconds: 0,
                QueueUrl: process.env.AWS_SQS_NOTIFICATION_REQUEST_URL,
                MessageBody: JSON.stringify(body),
                MessageGroupId: process.env.AWS_SQS_NOTIFICATION_REQUEST_NAME,
                MessageDeduplicationId: uuidv4(),
            });

            // 실제 SQS 전송 요청
            await this.client.send(command);
        } catch (e) {
            this.logger.error(e.message);
        }
  }

  ```

- 알림 시스템 전용 `Redis` `FamilyMember` DB 구축

  - Serverless 알림 시스템의 Cold Start를 극복하는 빠른 I/O

  - 서비스 특성상 Peak Time(정오) 존재, DB 트래픽 분산

  - Hash 자료구조를 사용한 효과적인 `FamilyMember` DB 구축, 빠른 탐색 시간

    ```JSON
    {
        // item key => hgetall O(n), 가족 구성원 수 한계에 따라 실질적 O(1)
        "family:${familyId}": {

            // hash key => O(1)
            "user:${userId}":
                {
                    "userName":"사용자명",
                    "fcmToken":"FCM 토큰",
                    "mktPushAreed":true
                },

            // hash key => O(1)
            "user:${userId}":
                {
                    "userName":"사용자명",
                    "fcmToken":"FCM 토큰",
                    "mktPushAreed":true
                }
        }
    }

    ```

  - `Redis Pipeline`을 사용하여 여러 familyId 입력에 대한 효율적인 Batch 탐색 적용

    - Network overhead인 `RTT` 최적화

    - Redis Kernel의 `Context Switching` overhead 최적화

  - 메인 API는 `setItem` 담당, 알림 시스템은 `getItem` 담당

- 알림 히스토리의 저장이 필요한 경우, 메인 서버가 RDBMS에 저장

  - 알림 히스토리 저장은 전체 알림 중 약 20%로 매우 적은 비중, 따라서 알림 시스템이 `SQS`를 통해 알림 저장 요청, 이를 Long Polling 방식으로 수신하여 Batch 처리

    ```typescript
    async receiveNotificationPayload() {
        let messagesReceived: Message[];

        const longPollingInterval = 20; // maximum
        const maxNumOfMessageToReceive = 10; // maximum

        try {
        const command = new ReceiveMessageCommand({
            MaxNumberOfMessages: maxNumOfMessageToReceive,
            MessageAttributeNames: ['All'],
            QueueUrl: process.env.AWS_SQS_NOTIFICATION_STORE_URL,
            WaitTimeSeconds: longPollingInterval, // 20초 단위 long polling
            VisibilityTimeout: 20,
        });

        const { Messages } = await this.client.send(command);
        messagesReceived = Messages;

        if (!messagesReceived) {
            return;
        }

      // SQS receiver와 알림 저장 비즈니스 로직을 decouple (SqsService는 여러 모듈에 inject 될 것이기   때문)
        this.eventEmitter.emit(
            SQS_NOTIFICATION_STORE_RECEIVE_EVENT,
        messagesReceived.map((message) => JSON.parse(message.Body)), // message body has    to be JSON
        );

        await this.clearConsumedMessages(messagesReceived);
        } catch (e) {
        if (e instanceof SyntaxError) {
            // JSON parse를 비롯한 syntax error의 경우 queue에서 삭제 처리
            await this.clearConsumedMessages(messagesReceived);
        }
        this.logger.error(messagesReceived, e.message);
        } finally {
        // receiveNotificationPayload - long polling
        this.receiveNotificationPayload();
        }
    }
    ```

## 프로젝트 구조 설계와 일부 NestJS Event 적용

### 업데이트 전

- 비즈니스 요구사항 구현에 급급하여 체계적이지 못한 프로젝트 구조로 특정 모듈에 책임 치중, 모듈 간 의존 관계 불명확

  - 예1: 회원탈퇴 기능 구현 시 모든 사용자 데이터를 삭제하기 위해 모든 Repository 의존성 주입, `UserService` 내에서 직접 처리

    ```typescript
    // v1. UserService.deleteUser

    // ...

    // delete from S3
    await this.uploadService.deletePhotos(fileUrls);

    // 2. messageFamCommentLike
    await this.messageFamCommentLikeRepository.delete({
      user: { id: userId },
    });

    // 3. messageCommentLike
    await this.messageCommentLikeRepository.delete({
      user: { id: userId },
    });

    // 4. photoCommentLike
    await this.photoCommentLikeRepository.delete({
      user: { id: userId },
    });

    // 5. photoLike
    await this.photoLikeRepository.delete({
      user: { id: userId },
    });

    // 6. messageMetoo
    await this.messageMetooRepository.delete({
      user: { id: userId },
    });

    // 7. messageFamMetoo
    await this.messageFamMetooRepository.delete({
      user: { id: userId },
    });

    // ... 후략
    ```

  - 예2: Scheduler를 사용한 작업이 각 도메인에 혼재

    ```typescript
    // Letter Service에 Scheduled Job 혼재, 유지 보수의 어려움

    @Cron('0 * * * * *')
    async chkTimeCapsuleOpened(): Promise<void> {
        const now = new Date();
        const aMinuteAgo = new Date(now);
        aMinuteAgo.setMinutes(aMinuteAgo.getMinutes() - 1);

        // 1. 최근 1분 이내에 공개된 타임캡슐 편지 찾기
        const lettersToNotif = await this.letterRepository.find({
        where: {
            isTimeCapsule: true,
            receiveDate: Between(aMinuteAgo, now),
            isRead: false,
            isTemp: false,
        },
        relations: { sender: true, receiver: true },
        });

        // ... 후략
    }

    ```

### 업데이트 후

- 서비스가 성장했을 때 언제든 모듈이 분리되어 운영될 수 있도록 책임을 명확히 분리

  - 예1: 회원탈퇴 기능 구현시 하나의 트랜잭션으로 처리돼야 하는 주요 테이블은 userService에서 구현, 사용량이 적은 새벽에 당일 탈퇴 사용자 처리 Batch Job으로 구현

  - 예2: 별도의 `Scheduler` 모듈 구성하여 관련 작업을 명확히 분리하여 유지보수성 향상, 추후 별개 시스템으로 용이한 분리 가능

    [user.service.ts](https://github.com/Sevenfold777/wooriga-backend-gql/blob/3e8207b831a0440c2914701a85160f5946088aca/src/user/user.service.ts)

    ```typescript

    async withdraw({ familyId, userId }: AuthUserId): Promise<BaseResponseDTO> {
        const queryRunner = this.dataSource.createQueryRunner();

        queryRunner.connect();
        queryRunner.startTransaction();

        try {
            const userUpdatePromise = queryRunner.manager
                .createQueryBuilder(User, 'user')
                .update()
                .where('id = :userId', { userId })
                .set({ status: UserStatus.DELETED, familyId: null, fcmToken: null })
                .updateEntity(false)
                .execute();

            // ... 중략

            await Promise.all([
                userUpdatePromise,
                userAuthPromise,
                photoUpdatePromise,
                photoCommentPromise,
                messageCommentPromise,
            ]);

            this.eventEmitter.emit(USER_WITHDRAW_EVENT, { familyId, userId });

            await queryRunner.commitTransaction();

            return { result: true };
        }
    }

    ```

    [scheduler.service.ts](https://github.com/Sevenfold777/wooriga-backend-gql/blob/3e8207b831a0440c2914701a85160f5946088aca/src/scheduler/scheduler.service.ts)

    ```typescript

     @Cron('0 0 3 * * *', { timeZone: process.env.TZ })
    private async deletePhotoFile(): Promise<void> {

    // ...

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

        // ... 후략
      }
     }
    }

    ```

- `NestJS Event` 도입으로 비즈니스 로직에서 파생되는 작업을 Decoupling 처리하여 책임 분리

  - 알림 시스템의 `Redis` `FamilyMember` 업데이트는 메인 API에서 User Entity를 update에 종속, 따라서 메인 API가 Redis의 `setItem`, `deletItem` 전부 처리, 알림 시스템은 읽기만 사용

  - User Entity를 update 시키는 서비스는 eventEmit으로 해당 작업이 발생했음을 알릴 뿐, 해당 로직 처리에 직접 관여 하지 않음

  [user.service.ts](https://github.com/Sevenfold777/wooriga-backend-gql/blob/3e8207b831a0440c2914701a85160f5946088aca/src/user/user.service.ts)

  ```typescript
  async fcmTokenUpdate(
      { userId }: AuthUserId,
      fcmTokenToUpdate: string,
  ): Promise<BaseResponseDTO> {
      // ...

      const user = await queryRunner.manager
          .createQueryBuilder(User, 'user')
          .select()
          .where('user.id = :userId', { userId })
          .getOneOrFail();

      if (user.fcmToken === fcmTokenToUpdate) {
          throw new Error('Unnecessary request for update fcm token.');
      }

      const updateResult = await queryRunner.manager
          .createQueryBuilder(User, 'user')
          .update()
          .where('user.id = :userId', { userId })
          .set({ fcmToken: fcmTokenToUpdate })
          .updateEntity(false)
          .execute();

      if (updateResult.affected !== 1) {
          throw new Error('Cannot update fcm token.');
      }

      user.fcmToken = fcmTokenToUpdate;
      this.eventEmitter.emit(USER_FCM_UPDATED_EVENT, user);

      return { result: true };
  }
  ```

  [notification.service.ts](https://github.com/Sevenfold777/wooriga-backend-gql/blob/3e8207b831a0440c2914701a85160f5946088aca/src/notification/notification.service.ts)

  ```typescript
  @OnEvent(USER_UPDATE_EVENT)
  @OnEvent(USER_FCM_UPDATED_EVENT)
  private async handleSetUserItem(user: User): Promise<void> {
    try {
      const redisFamilyMember = new RedisFamilyMember();
      redisFamilyMember.familyId = user.familyId;
      redisFamilyMember.userId = user.id;
      redisFamilyMember.userName = user.userName;
      redisFamilyMember.mktPushAgreed = user.mktPushAgreed;
      redisFamilyMember.fcmToken = user.fcmToken;

      return this.redisFamilyMemberService.setItem(redisFamilyMember);
    } catch (e) {
      this.logger.error(e);
    }
  }
  ```

## GraphQL 전환

- 모바일 앱의 첫 화면이자 주요 기능인 `오늘의 이야기`, `오늘의 감정`과 기타 부가적 기능은 하나의 Screen에서 동시에 Fetch되며, 매번 Screen이 Focus 될 때마다 refetch하도록 구현 --> Peak Time 부하 심화

  - 하나의 Screen을 구성하는 데에 4회 API fetch가 필요, screen onFocus마다 4회 재호출

  - 대다수의 사용자는 정오에 `오늘의 이야기` 전송 시 푸시 알림을 통해 서비스 진입, `AWS ELB Autoscaling`을 통해 탄력적으로 Load Balancing을 진행하지만 비용 문제로 서버의 성능이 좋지 못하기에 사용자 당 4회 API fetch 개선 필요

  - `GraphQL`의 `Under Fetch` 해결을 통해 애플리케이션 단에서 이러한 문제점 돌파 가능

  - 오늘의 이야기 화면, 4회 fetch 진행

    <img width=350 alt="app_home" src="https://github.com/Sevenfold777/wooriga-backend-gql/assets/88102203/2ac9180b-0c9b-45ea-bdd2-027ce1dc7f3a" />

- 서비스는 장기적으로 유지보수 될 것, PMF를 찾기 위해 많은 기획에 변경이 발생할 수 있으며 v1.의 `REST API`는 Breaking Change로 인한 유지보수의 어려움

  - `Over Fetch` 문제를 해결하는 `GraphQL`의 특성을 활용해 Evolving API로 서비스를 구현해 Breaking Change를 최소화하고 프런트엔드 개발의 유연성 확보

- GraphQL의 `Resolved Field`와 `Batch Load`를 지원하는 DataLoader를 사용하여 효과적으로 N + 1 문제를 예방하며, 비효율적인 복잡한 join을 제거하고 효율적이 쿼리로의 개선

  [photo.resolver.ts](https://github.com/Sevenfold777/wooriga-backend-gql/blob/3e8207b831a0440c2914701a85160f5946088aca/src/photo/photo.resolver.ts)

  ```typescript
  @ResolveField(() => PhotoCommentMetaDataDTO, { name: 'commentMetaData' })
  getCommentMetaData(@Parent() photo: Photo): Promise<PhotoCommentMetaDataDTO> {
      return this.photoService.getCommentMetaData(photo);
  }
  ```

  [photo.service.ts](https://github.com/Sevenfold777/wooriga-backend-gql/blob/3e8207b831a0440c2914701a85160f5946088aca/src/photo/photo.service.ts)

  ```typescript
  // get comment metadata
  async getCommentMetaData(photo: Photo): Promise<PhotoCommentMetaDataDTO> {
    try {
      const res: PhotoCommentMetaDataDTO = {
        commentsCount: 0,
        commentsPreview: [],
      };

      const comment = await this.batchPhotoCommentLoader.load(photo.id);

      if (comment) {
        res.commentsCount = comment.length;
        res.commentsPreview = comment.slice(0, 3);
      }

      return res;
    } catch (e) {
      this.logger.error('GraphQL Resolved Field', e);
      return { commentsCount: null, commentsPreview: null };
    }
  }


  // batch loader
  private batchPhotoCommentLoader = new DataLoader<number, PhotoComment[]>(
    async (photoIds: readonly number[]) => {
      const comments = await this.commentRepository
        .createQueryBuilder('comment')
        .select()
        .innerJoinAndSelect('comment.author', 'author')
        .where('comment.photoId IN (:...photoIds)', { photoIds })
        .andWhere('comment.status = :status', { status: CommentStatus.ACTIVE })
        .orderBy('comment.id', 'DESC')
        .getMany();

      const commentMap: { [key: number]: PhotoComment[] } = {};

      comments.forEach((comment) => {
        if (commentMap[comment.photoId]) {
          commentMap[comment.photoId].push(comment);
        } else {
          commentMap[comment.photoId] = [comment];
        }
      });

      return photoIds.map((photoId) => commentMap[photoId]);
    },
    { cache: false },
  );

  ```

## Custom Validator : Runtime Error 방지

- 알림 시스템 분리, NestJS Event 도입 등으로 인해 Argument Validation 없이 호출되는 함수 존재

- 이에 대한 Typescript의 Compile Time에 에러 체크 불가, 잠재적 Runtime Error 문제

- Global Pipe를 타지 않는, 프로젝트 내 호출 함수에 대하여 `class-validator`를 적용할 수 있도록 `@CustomValidator` 정의, 편리한 validation 프로세스 구축

- [notification.service.ts](https://github.com/Sevenfold777/wooriga-backend-gql/blob/1499c36e5ee3e8849e136f7f0b06aa3fd89f9787/src/notification/notification.service.ts#L38) : `SQS`로부터 수신한 Message Body에 대한 Validation 사례

  ```typescript

  @OnEvent(SQS_NOTIFICATION_STORE_RECEIVE_EVENT)
  @CustomValidate(CreateNotificationReqDTO) // <-- Custome Validator 적용
  private async handleNotificationStore(
    notifList: CreateNotificationReqDTO[],
  ): Promise<void> {
    try {
      const insertValues: QueryDeepPartialEntity<Notification>[] = [];

      for (const notif of notifList) {
        const { title, body, screen, param, receiverId } = notif;

        // ...
      }

      await this.notificationRepository
        .createQueryBuilder('notif')
        .insert()
        .into(Notification)
        .values(insertValues)
        .updateEntity(false)
        .execute();
    } catch (e) {
      this.logger.error(e);
    }
  }

  ```

- [create-notification-req.dto.ts](https://github.com/Sevenfold777/wooriga-backend-gql/blob/1499c36e5ee3e8849e136f7f0b06aa3fd89f9787/src/notification/dto/create-notification-req.dto.ts)

  ```typescript
  // GraphQL과 무관한 DTO (SQS로부터 consume)
  export class CreateNotificationReqDTO {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsString()
    body: string;

    @IsOptional()
    @IsString()
    screen?: string;

    @IsOptional()
    @IsObject()
    param?: object;

    @IsNumber()
    @Min(1)
    receiverId: number;
  }
  ```

- 이를 통해 예측 불가능한 Runtime Error를 핸들링 하며 신뢰성 있는 프로그램 개발, 개발자 간 협업에 이점

## TypeORM Query Builder 도입

### 업데이트 전

- `TypeORM Repository API`에 의존한 쿼리 작성, 그에 따른 예상치 못한 불필요한 쿼리 발생 및 성능 저하

  ```typescript
  async findLettersSent(
    { userId }: UserId,
    prev: number,
    isTimeCapsule: boolean,
  ): Promise<Letter[]> {
    // ...

    const letters = await this.letterRepository.find({
      where: [
        {
          sender: { id: userId },
          ...(timeCapusuleBool && {
            isTimeCapsule: timeCapusuleBool,
            receiveDate: MoreThanOrEqual(maxDate),
            isTemp: false,
          }),
        },
        !timeCapusuleBool && {
          sender: { id: userId },
          isTemp: true,
        },
      ],
      relations: { receiver: true, sender: true },
      order: { updatedAt: 'desc' },
      take,
      skip: take * prev,
    });

    return letters.sort((a, b) => {
      if (b.isTemp === true) {
        return 1;
      } else if (a.isTemp === true) {
        return -1;
      }
    });
  }

  ```

### 업데이트 후

- `TypeORM Query Builder` 사용과 철저한 `SQL` 로그 점검으로 가시적이며 협업에 유리한, 발전된 성능의 쿼리문 작성

  [letter.service.ts](https://github.com/Sevenfold777/wooriga-backend-gql/blob/3e8207b831a0440c2914701a85160f5946088aca/src/letter/letter.service.ts)

  ```typescript
   async findLetterAllBox(
    userId: number,
    type: LetterType,
    take: number,
    prev: number,
  ): Promise<LetterBoxResDTO> {
    try {
      const query = this.letterRepository.createQueryBuilder('letter').select();

      switch (type) {
        case LetterType.SENT:
          query
            .leftJoinAndSelect('letter.receiver', 'receiver')
            .where('letter.senderId = :userId', { userId })
            .orderBy('isTemp', 'DESC')
            .addOrderBy('letter.updatedAt', 'DESC')
            .addOrderBy('letter.id', 'DESC');
          break;

        // ...
      }

      const letters = await query
        .offset(take * prev)
        .limit(take)
        .getMany();

      return { result: true, letters };
    }

    // ...
  }
  ```

- 동적 쿼리에 대한 유연한 대응

  [family-pedia.service.ts](https://github.com/Sevenfold777/wooriga-backend-gql/blob/3e8207b831a0440c2914701a85160f5946088aca/src/family-pedia/family-pedia.service.ts)

  ```typescript
  // if 답장 안했을 경우 question 만든 사람 삭제 가능
  // if 피디아 주인이 삭제
  async deleteQuestion(
    { userId, familyId }: AuthUserId,
    id: number,
  ): Promise<BaseResponseDTO> {
    try {
      // ...

      const query = this.questionRepository
        .createQueryBuilder('question')
        .delete()
        .from(FamilyPediaQuestion)
        .where('id = :id', { id });

      // Pedia 주인 아닌 경우 - 답장 안했을 경우 question 만든 사람 삭제 가능
      if (targetQuestion.familyPedia.owner.id !== userId) {
        query
          .andWhere('questioner.id = :userId', { userId })
          .andWhere('answer IS NULL');
      }

      const deleteResult = await query.execute();

      if (deleteResult.affected !== 1) {
        throw new Error('Cannot delete the question due to permission.');
      }

      return { result: true };
    } catch (e) {
      return { result: false, error: e.message };
    }
  }

  ```

## Jest E2E Test

- `GraphQL` 전환으로 API 통신에 대한 테스트도 필요했으며, 최대한 빨리 `React Native`도 GraphQL로 전환해야 했기에 Unit test보다 E2E 테스트를 우선적으로 진행

- 총 109개의 `E2E 테스트`를, unit 테스트에 준할 정도로 세부적으로 작성하여 철저한 테스트를 진행 (성공 Case + 다양한 종류의 실패 Case 커버) [소스코드](https://github.com/Sevenfold777/wooriga-backend-gql/tree/3e8207b831a0440c2914701a85160f5946088aca/test)

- `AWS S3 presigned url`의 경우 본 프로젝트에서 최초로 사용했기에 실제 AWS와 연결된 `integration 테스트` 진행하여 철저한 프로그램 작성 [소스코드](https://github.com/Sevenfold777/wooriga-backend-gql/tree/3e8207b831a0440c2914701a85160f5946088aca/src/s3/__tests__)

- `Unit 테스트` 작성하지 않음에 따라 CI/CD 구현의 어려움

  - DB에 특정 레코드가 존재한다는 가정하에 작성된 테스트 존재, 자동화된 테스트와 배포로 이어나가기는 어려움

  - 따라서 [알림 시스템](https://github.com/Sevenfold777/wooriga-notification-serverless.git) 개발 시 `Unit 테스트`와 `E2E 테스트` 모두 철저히 작성하여 [Github Action](https://github.com/Sevenfold777/wooriga-notification-serverless/blob/f48028e47d8b6b446de8c945e23a8aaf5a136990/.github/workflows/sync-notif-constants.yml)을 사용한 CI/CD 구축

  - `React Native` GraphQL 전환 과정 중 지속적으로 본 프로젝트의 Unit Test 작성해나갈 예정

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  DeleteMessageBatchCommand,
  Message,
} from '@aws-sdk/client-sqs';
import { SqsNotificationProduceDTO } from './dto/sqs-notification-produce.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationType } from './constants/notification-type';
import { SQS_NOTIFICATION_STORE_RECEIVE_EVENT } from 'src/common/constants/events';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SqsNotificationService implements OnApplicationBootstrap {
  private client: SQSClient;
  private logger = new Logger('SQS Notification');

  constructor(private eventEmitter: EventEmitter2) {
    // init SQS client
    this.client = new SQSClient({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
      },
      region: process.env.DEFAULT_REGION,
    });
  }

  onApplicationBootstrap() {
    // receiveNotificationPayload - long polling
    this.receiveNotificationPayload();
  }

  async sendNotification(body: SqsNotificationProduceDTO<NotificationType>) {
    try {
      const command = new SendMessageCommand({
        DelaySeconds: 0,
        QueueUrl: process.env.AWS_SQS_NOTIFICATION_REQUEST_URL,
        MessageBody: JSON.stringify(body),
        MessageGroupId: process.env.AWS_SQS_NOTIFICATION_REQUEST_NAME,
        MessageDeduplicationId: uuidv4(),
      });

      await this.client.send(command);
    } catch (e) {
      this.logger.error(e.message);
    }
  }

  // TODO: polling on scheduler module
  /**
   * FIFO SQS
   * !!!항상 JSON data를 Message Body로 받아야!!!
   */
  async receiveNotificationPayload() {
    let messagesReceived: Message[];

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    let longPollingInterval = 20; // maximum

    /* 
      오늘의 이야기가 전송된 시점에는 저장해야할 알림(e.g. 댓글) 집중 
      따라서 polling interval을 낮춰 fifo sqs 대기열 maximum 개수를 초과하지 않고
      적당한 단위로 끊어서 db에 알림 batch insert 할 수 있도록 함
      AWARE: ec2 env timezone Asia/Seoul인지
    */
    if (JSON.parse(process.env.SQS_DYNAMIC_LONG_POLLING_INTERVAL)) {
      if ((hour === 11 && minute > 55) || (hour === 12 && minute < 20)) {
        longPollingInterval = 3;
      }
    }

    try {
      const command = new ReceiveMessageCommand({
        MaxNumberOfMessages: 10,
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

      // SQS receiver와 알림 저장 비즈니스 로직을 decouple (SqsService는 여러 모듈에 inject 될 것이기 때문)
      this.eventEmitter.emit(
        SQS_NOTIFICATION_STORE_RECEIVE_EVENT,
        messagesReceived.map((message) => JSON.parse(message.Body)), // message body has to be JSON
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

  // clear queue after consume logic
  private async clearConsumedMessages(messages: Message[]): Promise<void> {
    if (messages.length === 1) {
      await this.client.send(
        new DeleteMessageCommand({
          QueueUrl: process.env.AWS_SQS_NOTIFICATION_STORE_URL,
          ReceiptHandle: messages[0].ReceiptHandle,
        }),
      );
    } else {
      await this.client.send(
        new DeleteMessageBatchCommand({
          QueueUrl: process.env.AWS_SQS_NOTIFICATION_STORE_URL,
          Entries: messages.map((message) => ({
            Id: message.MessageId,
            ReceiptHandle: message.ReceiptHandle,
          })),
        }),
      );
    }
  }
}

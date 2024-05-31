import { Injectable } from '@nestjs/common';
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  DeleteMessageBatchCommand,
} from '@aws-sdk/client-sqs';
import { SqsNotificationProduceDTO } from './dto/sqs-notification-produce.dto';

@Injectable()
export class SqsNotificationService {
  private clientSQS: SQSClient;

  constructor() {
    this.clientSQS = new SQSClient({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
      },
      region: process.env.DEFAULT_REGION,
    });
  }

  async sendNotificationSQS(body: SqsNotificationProduceDTO) {
    try {
      const command = new SendMessageCommand({
        DelaySeconds: 0,
        QueueUrl: process.env.AWS_SQS_NOTIFICATION_PRODUCE_URL,
        MessageBody: JSON.stringify(body),
      });

      await this.clientSQS.send(command);
    } catch (e) {
      console.error(e.message);
    }
  }

  /**
   * FIFO SQS가 아니기에 정확한 순서를 보장하지 않음
   * Queue에 여러 개의 메세지가 있어도 한 개 또는 적은 수만 반환할 수 있음
   */
  // TODO: 직접 호출해줘야 => Scheduler와 연동 필요성 (또는 aws-sdk에서 방법있는지 확인)
  async receiveNotificationSQS() {
    try {
      // 아래의 수치는 테스트용
      const command = new ReceiveMessageCommand({
        MaxNumberOfMessages: 10,
        MessageAttributeNames: ['All'],
        QueueUrl: process.env.AWS_SQS_NOTIFICATION_STORE_URL,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 20,
      });

      const { Messages } = await this.clientSQS.send(command);
      console.log(Messages);

      if (!Messages) {
        return;
      }

      // clear queue after consume logic
      if (Messages.length === 1) {
        console.log('Single Message');

        await this.clientSQS.send(
          new DeleteMessageCommand({
            QueueUrl: process.env.AWS_SQS_NOTIFICATION_STORE_URL,
            ReceiptHandle: Messages[0].ReceiptHandle,
          }),
        );
      } else {
        console.log('Multiple Messages');

        await this.clientSQS.send(
          new DeleteMessageBatchCommand({
            QueueUrl: process.env.AWS_SQS_NOTIFICATION_STORE_URL,
            Entries: Messages.map((message) => ({
              Id: message.MessageId,
              ReceiptHandle: message.ReceiptHandle,
            })),
          }),
        );
      }
    } catch (e) {
      console.warn(e.message);
    }
  }
}

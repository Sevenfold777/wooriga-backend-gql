import { Injectable } from '@nestjs/common';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

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

  async sendNotificationSQS() {
    try {
      const command = new SendMessageCommand({
        DelaySeconds: 0,
        QueueUrl: process.env.AWS_SQS_NOTIFICATION_URL,
        MessageBody: 'payload test',
      });

      await this.clientSQS.send(command);
    } catch (e) {
      console.error(e.message);
    }
  }
}

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DynamoService {
  private docClient: DynamoDBDocumentClient;

  constructor() {
    // init Dynamodb client
    const client = new DynamoDBClient({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
      },
      region: process.env.DEFAULT_REGION,
    });

    // document client simplifies working with DynamoDB
    this.docClient = DynamoDBDocumentClient.from(client);
  }

  getDynamoDBDocumentClient(): DynamoDBDocumentClient {
    if (this.docClient) {
      return this.docClient;
    } else {
      throw new Error('DynamoDB document client not initiated.');
    }
  }
}

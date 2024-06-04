import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Injectable } from '@nestjs/common';
import { DynamoEntity, getDynamoTable } from './constants/dynamo-entity.type';

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

  // @CustomValidate(getClass(item))
  async putItem(item: DynamoEntity) {
    try {
      const table = getDynamoTable(item);

      const command = new PutCommand({
        TableName: table,
        Item: item,
      });

      await this.docClient.send(command);
    } catch (e) {
      console.error(
        'Failed to put given item to the corresponding dynamo db table.\n',
        e.message,
      );
    }
  }
}

import { DynamoService } from './dynamo.service';
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { Injectable } from '@nestjs/common';
import { DynamoUser } from './entities/dynamo-user.entity';
import { CustomValidate } from 'src/common/utils/custom-validate.decorator';
import { DynamoEditFamilyIdReqDTO } from './dto/dynamo-edit-familyId-req.dto';

@Injectable()
export class DynamoUserService {
  private docClient: DynamoDBDocumentClient;
  private table: string;

  constructor(private readonly dynamoService: DynamoService) {
    this.docClient = dynamoService.getDynamoDBDocumentClient();
    this.table = process.env.AWS_DYNAMODB_USER_TABLE;
  }

  @CustomValidate(DynamoUser)
  async putItem(item: DynamoUser): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.table,
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

  @CustomValidate(DynamoEditFamilyIdReqDTO)
  async updateFamilyId({
    userId,
    familyId,
  }: DynamoEditFamilyIdReqDTO): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: this.table,
        Key: {
          id: userId,
        },
        UpdateExpression: 'set familyId = :familyId',
        ExpressionAttributeValues: {
          ':familyId': familyId,
        },
        ReturnValues: 'NONE',
      });

      await this.docClient.send(command);
    } catch (e) {
      console.error(
        'Failed to update familyId to the corresponding user.\n',
        e.message,
      );
    }
  }
}

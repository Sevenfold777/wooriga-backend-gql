import { DynamoUser } from '../entities/dynamo-user.entity';

export type DynamoEntity = DynamoUser; // | DynamoNotification | DynamoFamily | ... etc

export function getDynamoTable(entity: DynamoEntity): string {
  if (entity instanceof DynamoUser) {
    return process.env.AWS_DYNAMODB_USER_TABLE;
  }

  // 예시
  // if (entity instanceof DynamoNotification) {
  //   return process.env.AWS_DYNAMODB_NOTIFICAITON;
  // }

  throw new Error('Invalid dynamodb table.');
}

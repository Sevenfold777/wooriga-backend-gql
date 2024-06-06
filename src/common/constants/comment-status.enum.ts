import { registerEnumType } from '@nestjs/graphql';

export enum CommentStatus {
  DELETED = 'deleted',
  ACTIVE = 'active',
}

registerEnumType(CommentStatus, { name: 'CommentStatus' });

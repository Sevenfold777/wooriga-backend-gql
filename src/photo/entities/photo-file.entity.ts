import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Photo } from './photo.entity';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@Entity()
@ObjectType()
export class PhotoFile {
  @PrimaryGeneratedColumn()
  @Field(() => Int)
  id: number;

  @Column({ unique: true })
  @Field()
  url: string;

  @Column({ nullable: true })
  @Field(() => Int, { nullable: true })
  width: number;

  @Column({ nullable: true })
  @Field(() => Int, { nullable: true })
  height: number;

  @Column()
  @Field(() => Int)
  photoId: number;

  @ManyToOne(() => Photo, (photo) => photo.files, { onDelete: 'CASCADE' })
  @Field(() => Photo)
  photo: Photo;

  @Column({ default: false })
  @Field(() => Boolean)
  uploaded: boolean;

  @CreateDateColumn()
  @Field(() => Date)
  createdAt: Date;
}

import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class DAU {
  @PrimaryColumn()
  date: Date;

  @Column()
  count: number;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import type { UrlEntity } from './url.entity.js';

@Entity('url_clicks')
export class UrlClickEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  urlId: string;

  @ManyToOne('UrlEntity', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'urlId' })
  url: Relation<UrlEntity>;

  @Column({ type: 'varchar', length: 64, nullable: true })
  browser?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  os?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  device?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  createdAt: Date;
}

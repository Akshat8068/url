import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UrlEntity } from './url.entity.js';

@Entity('url_clicks')
export class UrlClickEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  urlId: string;

  @ManyToOne(() => UrlEntity, (url) => url.clicks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'urlId' })
  url: UrlEntity;

  @Column({ type: 'varchar', length: 128, nullable: true })
  ipAddress?: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent?: string | null;

  @Column({ type: 'text', nullable: true })
  referer?: string | null;

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

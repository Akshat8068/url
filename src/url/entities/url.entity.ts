import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UrlClickEntity } from './url-click.entity.js';

@Entity('urls')
export class UrlEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  originalUrl: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  shortCode: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  customAlias?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ type: 'integer', default: 0 })
  clicksCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => UrlClickEntity, (click) => click.url, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  clicks: UrlClickEntity[];
}

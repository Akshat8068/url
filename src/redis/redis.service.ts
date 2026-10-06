import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;
  private readonly defaultTtl: number;

  constructor(private readonly configService: ConfigService) {
    this.defaultTtl = parseInt(
      this.configService.get<string>('REDIS_DEFAULT_TTL', '604800'),
      10,
    );
  }

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = parseInt(this.configService.get<string>('REDIS_PORT', '6379'), 10);
    const password = this.configService.get<string>('REDIS_PASSWORD') || undefined;

    try {
      this.client = new Redis({
        host,
        port,
        password,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 5) {
            this.logger.warn('Redis retry limit exceeded. Operating in DB-fallback mode.');
            return null;
          }
          return Math.min(times * 500, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Redis connected successfully to ${host}:${port}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection error: ${err.message}. Gracefully falling back to DB.`);
      });

      this.client.connect().catch((err) => {
        this.isConnected = false;
        this.logger.warn(`Redis initial connect failed: ${err.message}. Will operate in DB-fallback mode.`);
      });
    } catch (error) {
      this.isConnected = false;
      this.logger.warn(`Redis initialization failed: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (err) {
        this.logger.warn(`Error disconnecting Redis: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Generates a fixed 32-character MD5 hash of an input URL string
   */
  hashUrl(url: string): string {
    return crypto.createHash('md5').update(url.trim()).digest('hex');
  }

  /**
   * Get a string value from Redis
   */
  async get(key: string): Promise<string | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch (err) {
      this.logger.warn(`Redis GET failed for key "${key}": ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Set a key-value pair in Redis with optional TTL (in seconds)
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      const ttl = ttlSeconds ?? this.defaultTtl;
      if (ttl > 0) {
        await this.client.set(key, value, 'EX', ttl);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      this.logger.warn(`Redis SET failed for key "${key}": ${(err as Error).message}`);
    }
  }

  /**
   * Delete one or more keys from Redis
   */
  async del(...keys: string[]): Promise<void> {
    if (!this.isConnected || !this.client || keys.length === 0) return;
    try {
      const validKeys = keys.filter(Boolean);
      if (validKeys.length > 0) {
        await this.client.del(...validKeys);
      }
    } catch (err) {
      this.logger.warn(`Redis DEL failed for keys "${keys.join(', ')}": ${(err as Error).message}`);
    }
  }

  /**
   * Fast lookup: Get original URL given a shortCode or customAlias
   */
  async getOriginalUrlByCode(code: string): Promise<string | null> {
    return this.get(`url:code:${code}`);
  }

  /**
   * Fast lookup: Get shortCode given an original URL's MD5 hash (Deduplication)
   */
  async getShortCodeByHash(hash: string): Promise<string | null> {
    return this.get(`url:orig:${hash}`);
  }

  /**
   * Store bidirectional mappings in Redis
   */
  async cacheUrlMapping(params: {
    hash: string;
    shortCode: string;
    originalUrl: string;
    customAlias?: string | null;
    ttlSeconds?: number;
  }): Promise<void> {
    const ttl = params.ttlSeconds ?? this.defaultTtl;
    const promises: Promise<void>[] = [
      this.set(`url:orig:${params.hash}`, params.shortCode, ttl),
      this.set(`url:code:${params.shortCode}`, params.originalUrl, ttl),
    ];

    if (params.customAlias) {
      promises.push(this.set(`url:code:${params.customAlias}`, params.originalUrl, ttl));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Remove bidirectional mappings from Redis
   */
  async deleteUrlMapping(params: {
    hash?: string | null;
    shortCode: string;
    customAlias?: string | null;
  }): Promise<void> {
    const keysToDelete: string[] = [`url:code:${params.shortCode}`];
    if (params.hash) {
      keysToDelete.push(`url:orig:${params.hash}`);
    }
    if (params.customAlias) {
      keysToDelete.push(`url:code:${params.customAlias}`);
    }

    await this.del(...keysToDelete);
  }
}

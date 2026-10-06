import {
  Injectable,
  NotFoundException,
  ConflictException,
  GoneException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { customAlphabet } from 'nanoid';
import { UrlEntity } from './entities/url.entity.js';
import { CreateShortUrlDto, UrlResponseDto } from './dto/create-short-url.dto.js';
import { RedisService } from '../redis/redis.service.js';

const nanoid = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  7,
);

@Injectable()
export class UrlService {
  constructor(
    @InjectRepository(UrlEntity)
    private readonly urlRepository: Repository<UrlEntity>,
    private readonly redisService: RedisService,
  ) {}

  private mapToResponseDto(url: UrlEntity, baseUrl: string): UrlResponseDto {
    const code = url.customAlias || url.shortCode;
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const isExpired = url.expiresAt ? new Date(url.expiresAt) < new Date() : false;

    return {
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      shortUrl: `${cleanBaseUrl}/${code}`,
      customAlias: url.customAlias,
      title: url.title,
      expiresAt: url.expiresAt,
      isExpired,
      isActive: url.isActive,
      createdAt: url.createdAt,
      updatedAt: url.updatedAt,
    };
  }

  private calculateTtlSeconds(expiresAt?: Date | null): number | undefined {
    if (!expiresAt) return undefined;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    return diffMs > 0 ? Math.floor(diffMs / 1000) : 0;
  }

  async create(dto: CreateShortUrlDto, baseUrl: string): Promise<UrlResponseDto> {
    const originalUrl = dto.originalUrl.trim();
    let customAlias = dto.customAlias?.trim();
    const urlHash = this.redisService.hashUrl(originalUrl);

    // 1. If custom alias is provided, ensure it's not already in use
    if (customAlias) {
      const existingAlias = await this.urlRepository.findOne({
        where: [{ customAlias }, { shortCode: customAlias }],
      });
      if (existingAlias) {
        throw new ConflictException(`Custom alias "${customAlias}" is already taken.`);
      }
    } else {
      customAlias = null;

      // 2. Redis Fast Check (Deduplication via Hash)
      const cachedCode = await this.redisService.getShortCodeByHash(urlHash);
      if (cachedCode) {
        const existingCachedUrl = await this.urlRepository.findOne({
          where: { shortCode: cachedCode, isActive: true },
        });

        if (existingCachedUrl) {
          const isExpired = existingCachedUrl.expiresAt
            ? new Date(existingCachedUrl.expiresAt) <= new Date()
            : false;
          if (!isExpired) {
            return this.mapToResponseDto(existingCachedUrl, baseUrl);
          }
        }
      }

      // 3. DB Fallback Check (Deduplication via urlHash or originalUrl)
      const existingUrl = await this.urlRepository.findOne({
        where: [
          { urlHash, isActive: true },
          { originalUrl, isActive: true },
        ],
        order: { createdAt: 'DESC' },
      });

      if (existingUrl) {
        const isExpired = existingUrl.expiresAt
          ? new Date(existingUrl.expiresAt) <= new Date()
          : false;

        if (!isExpired) {
          // Repopulate Redis cache (Self-healing)
          const ttlSeconds = this.calculateTtlSeconds(existingUrl.expiresAt);
          await this.redisService.cacheUrlMapping({
            hash: urlHash,
            shortCode: existingUrl.shortCode,
            originalUrl: existingUrl.originalUrl,
            customAlias: existingUrl.customAlias,
            ttlSeconds,
          });

          return this.mapToResponseDto(existingUrl, baseUrl);
        }
      }
    }

    // 4. Generate a unique short code
    let shortCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      shortCode = nanoid();
      const existing = await this.urlRepository.findOne({
        where: [{ shortCode }, { customAlias: shortCode }],
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new ConflictException('Failed to generate a unique short code. Please try again.');
    }

    let expiresAt: Date | null = null;
    if (dto.expiresAt) {
      const parsedDate = new Date(dto.expiresAt);
      if (isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
        throw new BadRequestException('Expiration date must be a valid future date.');
      }
      expiresAt = parsedDate;
    } else if (dto.expiresInMinutes) {
      expiresAt = new Date(Date.now() + dto.expiresInMinutes * 60 * 1000);
    }

    // 5. Save to Database with urlHash
    const newUrl = this.urlRepository.create({
      originalUrl,
      urlHash,
      shortCode,
      customAlias,
      title: dto.title || null,
      expiresAt,
      isActive: true,
    });

    const saved = await this.urlRepository.save(newUrl) as UrlEntity;

    // 6. Write to Redis (Bidirectional Cache)
    const ttlSeconds = this.calculateTtlSeconds(expiresAt);
    await this.redisService.cacheUrlMapping({
      hash: urlHash,
      shortCode: saved.shortCode,
      originalUrl: saved.originalUrl,
      customAlias: saved.customAlias,
      ttlSeconds,
    });

    return this.mapToResponseDto(saved, baseUrl);
  }

  /**
   * Fast redirect lookup: checks Redis first (<1ms), falls back to DB on miss
   */
  async getDestinationForRedirect(code: string): Promise<string> {
    // 1. Redis Cache Hit Check
    const cachedUrl = await this.redisService.getOriginalUrlByCode(code);
    if (cachedUrl) {
      return cachedUrl;
    }

    // 2. Cache Miss: Query PostgreSQL
    const url = await this.findByCodeOrAlias(code);

    // 3. Repopulate Redis Cache (Self-healing)
    const ttlSeconds = this.calculateTtlSeconds(url.expiresAt);
    const hash = url.urlHash || this.redisService.hashUrl(url.originalUrl);
    await this.redisService.cacheUrlMapping({
      hash,
      shortCode: url.shortCode,
      originalUrl: url.originalUrl,
      customAlias: url.customAlias,
      ttlSeconds,
    });

    return url.originalUrl;
  }

  async findByCodeOrAlias(code: string): Promise<UrlEntity> {
    const url = await this.urlRepository.findOne({
      where: [
        { shortCode: code, isActive: true },
        { customAlias: code, isActive: true },
      ],
    });

    if (!url) {
      throw new NotFoundException(`Short URL for "${code}" was not found.`);
    }

    if (url.expiresAt && new Date(url.expiresAt) < new Date()) {
      throw new GoneException('This short URL has expired.');
    }

    return url;
  }

  async getAll(baseUrl: string): Promise<UrlResponseDto[]> {
    const urls = await this.urlRepository.find({
      order: { createdAt: 'DESC' },
    });
    return urls.map((u) => this.mapToResponseDto(u, baseUrl));
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  async getById(idOrCode: string, baseUrl: string): Promise<UrlResponseDto> {
    const whereConditions: Array<{ id?: string; shortCode?: string; customAlias?: string }> = [
      { shortCode: idOrCode },
      { customAlias: idOrCode },
    ];

    if (this.isUuid(idOrCode)) {
      whereConditions.unshift({ id: idOrCode });
    }

    const url = await this.urlRepository.findOne({
      where: whereConditions,
    });

    if (!url) {
      throw new NotFoundException(`URL not found.`);
    }

    return this.mapToResponseDto(url, baseUrl);
  }

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    // 1. Fetch URL to get hash and aliases for cache eviction
    const whereConditions: Array<{ id?: string; shortCode?: string; customAlias?: string }> = [
      { shortCode: id },
      { customAlias: id },
    ];
    if (this.isUuid(id)) {
      whereConditions.unshift({ id });
    }

    const existingUrl = await this.urlRepository.findOne({ where: whereConditions });

    if (!existingUrl) {
      throw new NotFoundException(`URL with identifier "${id}" not found.`);
    }

    // 2. Delete from DB
    await this.urlRepository.delete(existingUrl.id);

    // 3. Invalidate Redis Cache
    const hash = existingUrl.urlHash || this.redisService.hashUrl(existingUrl.originalUrl);
    await this.redisService.deleteUrlMapping({
      hash,
      shortCode: existingUrl.shortCode,
      customAlias: existingUrl.customAlias,
    });

    return { success: true, message: 'URL deleted successfully.' };
  }
}


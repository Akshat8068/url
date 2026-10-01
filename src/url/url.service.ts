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
import { UAParser } from 'ua-parser-js';
import { UrlEntity } from './entities/url.entity.js';
import { UrlClickEntity } from './entities/url-click.entity.js';
import { CreateShortUrlDto } from './dto/create-short-url.dto.js';
import { UrlResponseDto } from './dto/url-response.dto.js';
import { UrlAnalyticsDto, StatCount, ClicksOverTime } from './dto/analytics-response.dto.js';

const nanoid = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  7,
);

@Injectable()
export class UrlService {
  constructor(
    @InjectRepository(UrlEntity)
    private readonly urlRepository: Repository<UrlEntity>,
    @InjectRepository(UrlClickEntity)
    private readonly clickRepository: Repository<UrlClickEntity>,
  ) {}

  private mapToResponseDto(url: UrlEntity, baseUrl: string): UrlResponseDto {
    const code = url.customAlias || url.shortCode;
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const isExpired = url.expiresAt ? new Date(url.expiresAt) < new Date() : false;

    return {
      id: url.id,
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      shortUrl: `${cleanBaseUrl}/${code}`,
      customAlias: url.customAlias,
      title: url.title,
      expiresAt: url.expiresAt,
      isExpired,
      clicksCount: url.clicksCount,
      isActive: url.isActive,
      createdAt: url.createdAt,
      updatedAt: url.updatedAt,
    };
  }

  async create(dto: CreateShortUrlDto, baseUrl: string): Promise<UrlResponseDto> {
    let customAlias = dto.customAlias?.trim();
    if (customAlias) {
      const existing = await this.urlRepository.findOne({
        where: [{ customAlias }, { shortCode: customAlias }],
      });
      if (existing) {
        throw new ConflictException(`Custom alias "${customAlias}" is already in use.`);
      }
    } else {
      customAlias = null;
    }

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

    const newUrl = this.urlRepository.create({
      originalUrl: dto.originalUrl,
      shortCode,
      customAlias,
      title: dto.title || null,
      expiresAt,
      clicksCount: 0,
      isActive: true,
    });

    const saved = await this.urlRepository.save(newUrl);
    return this.mapToResponseDto(saved, baseUrl);
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

  async recordClick(
    url: UrlEntity,
    meta: {
      ip?: string;
      userAgent?: string;
      referer?: string;
    },
  ): Promise<void> {
    try {
      let browser = 'Unknown';
      let os = 'Unknown';
      let device = 'Desktop';

      if (meta.userAgent) {
        const parser = new UAParser(meta.userAgent);
        const parsed = parser.getResult();
        browser = parsed.browser.name || 'Unknown';
        os = parsed.os.name || 'Unknown';
        device = parsed.device.type
          ? parsed.device.type.charAt(0).toUpperCase() + parsed.device.type.slice(1)
          : 'Desktop';
      }

      let refererClean: string | null = null;
      if (meta.referer) {
        try {
          const urlObj = new URL(meta.referer);
          refererClean = urlObj.hostname || meta.referer;
        } catch {
          refererClean = meta.referer;
        }
      } else {
        refererClean = 'Direct / Email / App';
      }

      const click = this.clickRepository.create({
        urlId: url.id,
        ipAddress: meta.ip || null,
        userAgent: meta.userAgent || null,
        referer: refererClean,
        browser,
        os,
        device,
      });

      await this.clickRepository.save(click);
      await this.urlRepository.increment({ id: url.id }, 'clicksCount', 1);
    } catch (err) {
      console.error('Error recording click analytics:', err);
    }
  }

  async getAll(baseUrl: string): Promise<UrlResponseDto[]> {
    const urls = await this.urlRepository.find({
      order: { createdAt: 'DESC' },
    });
    return urls.map((u) => this.mapToResponseDto(u, baseUrl));
  }

  async getAnalytics(codeOrId: string, baseUrl: string): Promise<UrlAnalyticsDto> {
    const url = await this.urlRepository.findOne({
      where: [{ id: codeOrId }, { shortCode: codeOrId }, { customAlias: codeOrId }],
    });

    if (!url) {
      throw new NotFoundException(`URL not found.`);
    }

    const clicks = await this.clickRepository.find({
      where: { urlId: url.id },
      order: { createdAt: 'DESC' },
      take: 500,
    });

    // Aggregate stats
    const referrerMap = new Map<string, number>();
    const browserMap = new Map<string, number>();
    const osMap = new Map<string, number>();
    const deviceMap = new Map<string, number>();
    const dateMap = new Map<string, number>();

    // Pre-populate last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      dateMap.set(dateKey, 0);
    }

    clicks.forEach((c) => {
      // Date count
      const dateKey = c.createdAt.toISOString().split('T')[0];
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);

      // Referrer
      const ref = c.referer || 'Direct / Email / App';
      referrerMap.set(ref, (referrerMap.get(ref) || 0) + 1);

      // Browser
      const br = c.browser || 'Unknown';
      browserMap.set(br, (browserMap.get(br) || 0) + 1);

      // OS
      const os = c.os || 'Unknown';
      osMap.set(os, (osMap.get(os) || 0) + 1);

      // Device
      const dev = c.device || 'Desktop';
      deviceMap.set(dev, (deviceMap.get(dev) || 0) + 1);
    });

    const mapToSortedStatCounts = (map: Map<string, number>): StatCount[] =>
      Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const clicksOverTime: ClicksOverTime[] = Array.from(dateMap.entries()).map(
      ([date, count]) => ({ date, count }),
    );

    return {
      url: this.mapToResponseDto(url, baseUrl),
      totalClicks: url.clicksCount,
      clicksOverTime,
      topReferrers: mapToSortedStatCounts(referrerMap).slice(0, 10),
      topBrowsers: mapToSortedStatCounts(browserMap).slice(0, 10),
      topOperatingSystems: mapToSortedStatCounts(osMap).slice(0, 10),
      topDevices: mapToSortedStatCounts(deviceMap).slice(0, 10),
      recentClicks: clicks.slice(0, 50).map((c) => ({
        id: c.id,
        ipAddress: c.ipAddress,
        referer: c.referer,
        browser: c.browser,
        os: c.os,
        device: c.device,
        createdAt: c.createdAt,
      })),
    };
  }

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const url = await this.urlRepository.findOne({ where: { id } });
    if (!url) {
      throw new NotFoundException(`URL not found`);
    }

    await this.urlRepository.remove(url);
    return { success: true, message: 'URL deleted successfully.' };
  }
}

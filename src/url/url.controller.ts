import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import type { Request } from 'express';
import { UrlService } from './url.service.js';
import { CreateShortUrlDto } from './dto/create-short-url.dto.js';
import { UrlResponseDto } from './dto/url-response.dto.js';
import { UrlAnalyticsDto } from './dto/analytics-response.dto.js';

@Controller('api/urls')
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  private getBaseUrl(req: Request): string {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    return process.env.BASE_URL || `${protocol}://${host}`;
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @Body() createDto: CreateShortUrlDto,
    @Req() req: Request,
  ): Promise<UrlResponseDto> {
    const baseUrl = this.getBaseUrl(req);
    return this.urlService.create(createDto, baseUrl);
  }

  @Get()
  async getAll(@Req() req: Request): Promise<UrlResponseDto[]> {
    const baseUrl = this.getBaseUrl(req);
    return this.urlService.getAll(baseUrl);
  }

  @Get(':codeOrId/analytics')
  async getAnalytics(
    @Param('codeOrId') codeOrId: string,
    @Req() req: Request,
  ): Promise<UrlAnalyticsDto> {
    const baseUrl = this.getBaseUrl(req);
    return this.urlService.getAnalytics(codeOrId, baseUrl);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return this.urlService.delete(id);
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UrlEntity } from './entities/url.entity.js';
import { UrlService } from './url.service.js';
import { UrlController } from './url.controller.js';
import { RedirectController } from './redirect.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([UrlEntity])],
  controllers: [UrlController, RedirectController],
  providers: [UrlService],
  exports: [UrlService],
})
export class UrlModule {}

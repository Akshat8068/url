import {
  Controller,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { UrlService } from './url.service.js';

@Controller()
export class RedirectController {
  constructor(private readonly urlService: UrlService) {}



  @Get(':code')
  async redirect(
    @Param('code') code: string,
    @Res() res: Response,
  ) {
    if (!code || code === 'favicon.ico' || code === 'api') {
      return res.status(404).json({ statusCode: 404, message: 'Not Found' });
    }

    const destinationUrl = await this.urlService.getDestinationForRedirect(code);
    return res.redirect(302, destinationUrl);
  }
}

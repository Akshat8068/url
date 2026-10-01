import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  NotFoundException,
  GoneException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { UrlService } from './url.service.js';

@Controller()
export class RedirectController {
  constructor(private readonly urlService: UrlService) {}

  @Get('health')
  healthCheck() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get(':code')
  async redirect(
    @Param('code') code: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Avoid intercepting root or static asset-like requests
    if (!code || code === 'favicon.ico' || code === 'api' || code === 'index.html') {
      return res.status(404).send('Not Found');
    }

    try {
      const urlEntity = await this.urlService.findByCodeOrAlias(code);

      // Extract client metadata for click tracking
      const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
      const ip = Array.isArray(rawIp) ? rawIp[0] : (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : undefined);
      const userAgent = req.headers['user-agent'] || undefined;
      const referer = req.headers['referer'] || req.headers['referrer'] || undefined;

      // Track click in background
      this.urlService.recordClick(urlEntity, {
        ip,
        userAgent,
        referer: typeof referer === 'string' ? referer : undefined,
      }).catch((err) => console.error('Click logging error:', err));

      // Perform redirect
      return res.redirect(302, urlEntity.originalUrl);
    } catch (error) {
      if (error instanceof GoneException) {
        return res.status(410).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Link Expired - URL Shortener</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
                .card { background: #1e293b; border: 1px solid #334155; padding: 2.5rem; border-radius: 1rem; text-align: center; max-width: 420px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                h1 { color: #f43f5e; margin: 0 0 1rem; font-size: 1.75rem; }
                p { color: #94a3b8; line-height: 1.6; margin-bottom: 1.5rem; }
                a { display: inline-block; background: #6366f1; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 500; transition: background 0.2s; }
                a:hover { background: #4f46e5; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>Link Expired</h1>
                <p>This shortened link has expired and is no longer active.</p>
                <a href="/">Go to Home Dashboard</a>
              </div>
            </body>
          </html>
        `);
      }

      if (error instanceof NotFoundException) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Link Not Found - URL Shortener</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
                .card { background: #1e293b; border: 1px solid #334155; padding: 2.5rem; border-radius: 1rem; text-align: center; max-width: 420px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                h1 { color: #38bdf8; margin: 0 0 1rem; font-size: 1.75rem; }
                p { color: #94a3b8; line-height: 1.6; margin-bottom: 1.5rem; }
                a { display: inline-block; background: #6366f1; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 500; transition: background 0.2s; }
                a:hover { background: #4f46e5; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>Link Not Found</h1>
                <p>The shortened link "${code}" could not be found or has been removed.</p>
                <a href="/">Go to Home Dashboard</a>
              </div>
            </body>
          </html>
        `);
      }

      return res.status(500).send('Internal Server Error');
    }
  }
}

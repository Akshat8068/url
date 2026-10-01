import { UrlResponseDto } from './url-response.dto.js';

export interface ClickLogItem {
  id: string;
  ipAddress?: string | null;
  referer?: string | null;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  createdAt: Date;
}

export interface StatCount {
  name: string;
  count: number;
}

export interface ClicksOverTime {
  date: string;
  count: number;
}

export interface UrlAnalyticsDto {
  url: UrlResponseDto;
  totalClicks: number;
  clicksOverTime: ClicksOverTime[];
  topReferrers: StatCount[];
  topBrowsers: StatCount[];
  topOperatingSystems: StatCount[];
  topDevices: StatCount[];
  recentClicks: ClickLogItem[];
}

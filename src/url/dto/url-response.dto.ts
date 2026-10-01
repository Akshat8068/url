export interface UrlResponseDto {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  customAlias?: string | null;
  title?: string | null;
  expiresAt?: Date | null;
  isExpired: boolean;
  clicksCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

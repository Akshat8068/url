// Matches backend UrlResponseDto exactly
export interface UrlResponse {
  originalUrl: string
  shortCode: string
  shortUrl: string
  customAlias: string | null
  title: string | null
  expiresAt: string | null
  isExpired: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Matches backend CreateShortUrlDto
export interface CreateShortUrlPayload {
  originalUrl: string
  customAlias?: string
  title?: string
  expiresInMinutes?: number
}

export interface ApiError {
  message: string
  statusCode: number
}

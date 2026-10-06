import {
  IsUrl,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Length,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';

export class CreateShortUrlDto {
  @IsNotEmpty({ message: 'Original URL cannot be empty' })
  @IsUrl(
    { require_protocol: true },
    { message: 'Must be a valid URL starting with http:// or https://' },
  )
  originalUrl: string;

  @IsOptional()
  @IsString()
  @Length(3, 50, { message: 'Custom alias must be between 3 and 50 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Custom alias can only contain letters, numbers, hyphens, and underscores',
  })
  customAlias?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Expiration in minutes must be at least 1 minute' })
  @Max(525600, { message: 'Expiration in minutes cannot exceed 1 year' })
  expiresInMinutes?: number;

  @IsOptional()
  @IsDateString({}, { message: 'expiresAt must be a valid ISO date string' })
  expiresAt?: string;
}
export interface UrlResponseDto {
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  customAlias?: string | null;
  title?: string | null;
  expiresAt?: Date | null;
  isExpired: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}


export interface PublishResult {
  success: boolean;
  platform: string;
  platformPostId?: string;
  platformUrl?: string;
  publishedAt?: Date;
  error?: string;
  requiresAuth?: boolean;
  rateLimited?: boolean;
}

export interface SocialPost {
  content: string;
  hashtags?: string[];
  imageUrl?: string;
  link?: string;
  title?: string;
  description?: string;
}

export interface PlatformAdapter {
  name: string;
  isConnected(): Promise<boolean>;
  publish(post: SocialPost): Promise<PublishResult>;
  getAuthUrl?(): string | Promise<string>;
  refreshToken?(): Promise<boolean>;
}

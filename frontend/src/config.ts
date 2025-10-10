import { getSiteURL } from '@/lib/get-site-url';
import { LogLevel } from '@/lib/logger';

export interface Config {
  site: { name: string; description: string; themeColor: string; url: string };
  logLevel: keyof typeof LogLevel;
  api: { baseUrl: string };
}

export const config: Config = {
  site: { name: 'Devias Kit', description: '', themeColor: '#090a0b', url: getSiteURL() },
  logLevel: (process.env.NEXT_PUBLIC_LOG_LEVEL as keyof typeof LogLevel) ?? LogLevel.ALL,
  api: { 
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
  },
};

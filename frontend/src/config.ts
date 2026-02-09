import { getSiteURL } from '@/lib/get-site-url';
import { LogLevel } from '@/lib/logger';

export interface Config {
  site: { name: string; description: string; themeColor: string; url: string };
  logLevel: keyof typeof LogLevel;
  api: { baseUrl: string };
  onlyoffice: { url: string; apiUrl: string };
}

export const config: Config = {
  site: { name: 'Megapixel', description: '', themeColor: '#090a0b', url: getSiteURL() },
  logLevel: (process.env.NEXT_PUBLIC_LOG_LEVEL as keyof typeof LogLevel) ?? LogLevel.ALL,
  api: {
    // ✅ best: same-origin via nginx (/api)
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api',
  },
  onlyoffice: {
    // ✅ best: same-origin via nginx (/onlyoffice)
    url: process.env.NEXT_PUBLIC_ONLYOFFICE_URL ?? '/onlyoffice',
    apiUrl: `${process.env.NEXT_PUBLIC_ONLYOFFICE_URL ?? '/onlyoffice'}/web-apps/apps/api/documents/api.js`,
  },
};

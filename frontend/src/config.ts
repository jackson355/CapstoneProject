import { getSiteURL } from '@/lib/get-site-url';
import { LogLevel } from '@/lib/logger';

export interface Config {
  site: { name: string; description: string; themeColor: string; url: string };
  logLevel: keyof typeof LogLevel;
  api: { baseUrl: string };
  onlyoffice: { url: string; apiUrl: string };
}

// --- helpers ---
const isBrowser = typeof window !== 'undefined';
const defaultDomain = 'https://project.megapixel.sg';

// ✅ Always use HTTPS when running on the real domain.
// ✅ Always route backend via /api (nginx reverse proxy).
const defaultApiBase =
  isBrowser && window.location.hostname !== 'localhost'
    ? `${defaultDomain}/api`
    : 'http://localhost:8000';

// ✅ OnlyOffice should be accessed via your domain too (through nginx),
// not via http://IP:8080, otherwise mixed content + websocket issues.
const defaultOnlyOfficeBase =
  isBrowser && window.location.hostname !== 'localhost'
    ? `${defaultDomain}/onlyoffice`
    : 'http://localhost:8080';

export const config: Config = {
  site: { name: 'Devias Kit', description: '', themeColor: '#090a0b', url: getSiteURL() },
  logLevel: (process.env.NEXT_PUBLIC_LOG_LEVEL as keyof typeof LogLevel) ?? LogLevel.ALL,

  api: {
    // Expected in prod:
    // NEXT_PUBLIC_API_BASE_URL=https://project.megapixel.sg/api
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBase,
  },

  onlyoffice: {
    // Expected in prod:
    // NEXT_PUBLIC_ONLYOFFICE_URL=https://project.megapixel.sg/onlyoffice
    url: process.env.NEXT_PUBLIC_ONLYOFFICE_URL ?? defaultOnlyOfficeBase,
    apiUrl: `${process.env.NEXT_PUBLIC_ONLYOFFICE_URL ?? defaultOnlyOfficeBase}/web-apps/apps/api/documents/api.js`,
  },
};
/**
 * Environment configuration and safe validation helper.
 */

export interface EnvConfig {
  BACKEND_API_BASE_URL: string;
  NEXT_PUBLIC_APP_NAME: string;
  NEXT_PUBLIC_API_BASE_URL: string;
  NEXT_PUBLIC_SOCKET_URL: string;
  IS_PRODUCTION: boolean;
  IS_DEVELOPMENT: boolean;
}

export function validateEnv(): EnvConfig {
  const BACKEND_API_BASE_URL =
    process.env.BACKEND_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ||
    'http://localhost:3000';

  const NEXT_PUBLIC_APP_NAME =
    process.env.NEXT_PUBLIC_APP_NAME || 'Flat Finder';

  const NEXT_PUBLIC_API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || '/api/proxy';

  const NEXT_PUBLIC_SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL || BACKEND_API_BASE_URL;

  const nodeEnv = process.env.NODE_ENV || 'development';

  return {
    BACKEND_API_BASE_URL,
    NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_SOCKET_URL,
    IS_PRODUCTION: nodeEnv === 'production',
    IS_DEVELOPMENT: nodeEnv === 'development',
  };
}

export const env = validateEnv();

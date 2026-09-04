/**
 * Environment configuration and safe validation helper.
 */

export interface EnvConfig {
  BACKEND_API_BASE_URL: string;
  NEXT_PUBLIC_APP_NAME: string;
  NEXT_PUBLIC_API_BASE_URL: string;
  NEXT_PUBLIC_SOCKET_URL: string;
  NEXT_PUBLIC_IS_BETA: boolean;
  IS_PRODUCTION: boolean;
  IS_DEVELOPMENT: boolean;
}

export function validateEnv(): EnvConfig {
  const BACKEND_API_BASE_URL =
    process.env.BACKEND_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ||
    'http://localhost:3000';

  const NEXT_PUBLIC_APP_NAME =
    process.env.NEXT_PUBLIC_APP_NAME || 'Fledge';

  const NEXT_PUBLIC_API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || '/api/proxy';

  const NEXT_PUBLIC_SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL || BACKEND_API_BASE_URL;

  const rawIsBeta =
    process.env.NEXT_PUBLIC_IS_BETA ??
    process.env.NEXT_PUBLIC_SHOW_BETA_TAG ??
    process.env.NEXT_PUBLIC_BETA ??
    'true';

  const NEXT_PUBLIC_IS_BETA =
    rawIsBeta === 'true' ||
    rawIsBeta === '1' ||
    rawIsBeta === 'yes';

  const nodeEnv = process.env.NODE_ENV || 'development';

  return {
    BACKEND_API_BASE_URL,
    NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_SOCKET_URL,
    NEXT_PUBLIC_IS_BETA,
    IS_PRODUCTION: nodeEnv === 'production',
    IS_DEVELOPMENT: nodeEnv === 'development',
  };
}

export const env = validateEnv();

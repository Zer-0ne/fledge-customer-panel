/**
 * Standardized API Error handling and normalization module.
 */

export interface NormalizedError {
  status: number;
  message: string;
  code?: string;
  field?: string;
  details?: unknown;
}

export class ApiError extends Error implements NormalizedError {
  status: number;
  code?: string;
  field?: string;
  details?: unknown;

  constructor(normalized: NormalizedError) {
    super(normalized.message);
    this.name = 'ApiError';
    this.status = normalized.status;
    this.code = normalized.code;
    this.field = normalized.field;
    this.details = normalized.details;
  }
}

const DEFAULT_STATUS_MESSAGES: Record<number, string> = {
  400: 'Invalid request data. Please check your inputs.',
  401: 'Authentication required. Please log in.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource could not be found.',
  409: 'Conflict detected. The resource may already exist.',
  422: 'Validation error. Please verify the entered details.',
  429: 'Too many requests. Please slow down and try again.',
  500: 'Internal server error. Please try again later.',
  530: 'Database or backend service is currently unavailable.',
};

/**
 * Normalizes any caught error or HTTP response error payload into a standard NormalizedError object.
 */
export function normalizeApiError(error: unknown, fallbackStatus = 500): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;

    // The backend wraps failures as { error: { code, message, ... } } (Nest
    // exception filter). Unwrap before reading fields, else every backend
    // message/code is lost and the UI falls back to generic status text.
    const wrapped =
      errObj.error && typeof errObj.error === 'object' && !Array.isArray(errObj.error)
        ? (errObj.error as Record<string, unknown>)
        : errObj;

    const status =
      typeof wrapped.status === 'number'
        ? wrapped.status
        : typeof wrapped.statusCode === 'number'
          ? wrapped.statusCode
          : typeof errObj.status === 'number'
            ? errObj.status
            : typeof errObj.statusCode === 'number'
              ? errObj.statusCode
              : fallbackStatus;

    let message =
      typeof wrapped.message === 'string'
        ? wrapped.message
        : typeof errObj.message === 'string'
          ? errObj.message
          : DEFAULT_STATUS_MESSAGES[status] || 'An unexpected error occurred.';

    // If message is an array (NestJS default validation error format), format it nicely
    if (Array.isArray(wrapped.message) && wrapped.message.length > 0) {
      message = wrapped.message.join(', ');
    } else if (Array.isArray(errObj.message) && errObj.message.length > 0) {
      message = errObj.message.join(', ');
    }

    const code = typeof wrapped.code === 'string' ? wrapped.code : typeof errObj.code === 'string' ? errObj.code : undefined;
    const field = typeof wrapped.field === 'string' ? wrapped.field : typeof errObj.field === 'string' ? errObj.field : undefined;

    return new ApiError({
      status,
      message,
      code,
      field,
      details: errObj.details ?? error,
    });
  }

  if (typeof error === 'string') {
    return new ApiError({
      status: fallbackStatus,
      message: error,
    });
  }

  return new ApiError({
    status: fallbackStatus,
    message: DEFAULT_STATUS_MESSAGES[fallbackStatus] || 'An unexpected error occurred.',
    details: error,
  });
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

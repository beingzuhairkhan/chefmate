import { secureSession } from '@/lib/secureSession';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  authenticated?: boolean;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string | string[];
  error?: string;
};

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '');
export const isLiveBackend = Boolean(API_BASE);

function messageFrom(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.message === 'string') return record.message;
  if (Array.isArray(record.message)) return record.message.filter((item): item is string => typeof item === 'string').join(', ');
  if (typeof record.error === 'string') return record.error;
  return undefined;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE) throw new ApiError('EXPO_PUBLIC_API_BASE_URL is not configured.');

  const headers: Record<string, string> = {};
  const token = options.authenticated === false ? null : await secureSession.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
  } catch (error) {
    const reason = error instanceof Error ? ` ${error.message}` : '';
    throw new ApiError(`Could not reach ChefMate.${reason}`);
  }

  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(messageFrom(payload) ?? `ChefMate returned HTTP ${response.status}.`, response.status);
  }
  if (payload && typeof payload === 'object' && 'success' in payload && (payload as ApiEnvelope<T>).success === false) {
    throw new ApiError(messageFrom(payload) ?? 'ChefMate rejected the request.', response.status);
  }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data as T;
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, authenticated = true) => request<T>(path, { method: 'POST', body, authenticated }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: async <T>(path: string, uri: string) => {
    if (!API_BASE) throw new ApiError('EXPO_PUBLIC_API_BASE_URL is not configured.');
    const form = new FormData();
    const fileName = uri.split(/[\\/]/).pop() || 'fridge.jpg';
    const extension = fileName.split('.').pop()?.toLowerCase();
    const type = extension === 'png' ? 'image/png' : 'image/jpeg';
    form.append('image', { uri, name: fileName, type } as unknown as Blob);

    const token = await secureSession.getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: form });
    } catch (error) {
      const reason = error instanceof Error ? ` ${error.message}` : '';
      throw new ApiError(`Could not send the image to ChefMate.${reason}`);
    }

    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new ApiError(messageFrom(payload) ?? `ChefMate returned HTTP ${response.status}.`, response.status);
    }
    if (payload && typeof payload === 'object' && 'success' in payload && (payload as ApiEnvelope<T>).success === false) {
      throw new ApiError(messageFrom(payload) ?? 'ChefMate rejected the image.', response.status);
    }
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return (payload as ApiEnvelope<T>).data as T;
    }
    return payload as T;
  },
};


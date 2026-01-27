/**
 * Mock axios instance and API response utilities for frontend unit tests
 */

import { vi } from 'vitest';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

// ============================================================================
// Mock Axios Instance
// ============================================================================

type MockAxiosMethod = ReturnType<typeof vi.fn>;

interface MockAxiosInstance {
  get: MockAxiosMethod;
  post: MockAxiosMethod;
  put: MockAxiosMethod;
  patch: MockAxiosMethod;
  delete: MockAxiosMethod;
  request: MockAxiosMethod;
  interceptors: {
    request: {
      use: MockAxiosMethod;
      eject: MockAxiosMethod;
    };
    response: {
      use: MockAxiosMethod;
      eject: MockAxiosMethod;
    };
  };
  defaults: {
    baseURL: string;
    headers: Record<string, unknown>;
  };
  create: () => MockAxiosInstance;
}

/**
 * Create a mock axios instance with all methods as vi.fn()
 */
export function createMockAxios(): MockAxiosInstance {
  const mockAxios: MockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn(),
        eject: vi.fn(),
      },
      response: {
        use: vi.fn(),
        eject: vi.fn(),
      },
    },
    defaults: {
      baseURL: 'http://localhost:5000/api',
      headers: {
        common: {},
      },
    },
    create: () => createMockAxios(),
  };

  return mockAxios;
}

/**
 * Global mock axios instance for use across tests
 */
export const mockAxios = createMockAxios();

// ============================================================================
// Response Factory Functions
// ============================================================================

/**
 * Create a successful axios response
 */
export function createAxiosResponse<T>(
  data: T,
  status = 200,
  statusText = 'OK'
): AxiosResponse<T> {
  return {
    data,
    status,
    statusText,
    headers: {},
    config: {} as AxiosRequestConfig,
  } as AxiosResponse<T>;
}

/**
 * Create a successful API response wrapped in data object
 * Matches the standard backend response format: { status: 'success', data: T }
 */
export function createApiSuccessResponse<T>(data: T): AxiosResponse<{ status: 'success'; data: T }> {
  return createAxiosResponse({
    status: 'success' as const,
    data,
  });
}

/**
 * Create an API error response
 */
export function createApiErrorResponse(
  message: string,
  status = 400
): AxiosResponse<{ status: 'error'; message: string }> {
  return createAxiosResponse(
    {
      status: 'error' as const,
      message,
    },
    status,
    'Bad Request'
  );
}

/**
 * Create an axios error object
 */
export function createAxiosError(
  message: string,
  status = 400,
  responseData?: Record<string, unknown>
): Error & { response?: AxiosResponse; isAxiosError: boolean } {
  const error = new Error(message) as Error & {
    response?: AxiosResponse;
    isAxiosError: boolean;
    config: AxiosRequestConfig;
  };

  error.isAxiosError = true;
  error.config = {} as AxiosRequestConfig;

  if (responseData || status) {
    error.response = createAxiosResponse(
      responseData || { status: 'error', message },
      status
    );
  }

  return error;
}

// ============================================================================
// Mock Setup Helpers
// ============================================================================

/**
 * Setup mock axios to return successful response for GET request
 */
export function mockGet<T>(url: string | RegExp, data: T): void {
  mockAxios.get.mockImplementation((requestUrl: string) => {
    if (typeof url === 'string' ? requestUrl === url : url.test(requestUrl)) {
      return Promise.resolve(createAxiosResponse({ data }));
    }
    return Promise.reject(createAxiosError('Not found', 404));
  });
}

/**
 * Setup mock axios to return successful response for POST request
 */
export function mockPost<T>(url: string | RegExp, data: T): void {
  mockAxios.post.mockImplementation((requestUrl: string) => {
    if (typeof url === 'string' ? requestUrl === url : url.test(requestUrl)) {
      return Promise.resolve(createAxiosResponse({ data }));
    }
    return Promise.reject(createAxiosError('Not found', 404));
  });
}

/**
 * Setup mock axios to return successful response for PUT request
 */
export function mockPut<T>(url: string | RegExp, data: T): void {
  mockAxios.put.mockImplementation((requestUrl: string) => {
    if (typeof url === 'string' ? requestUrl === url : url.test(requestUrl)) {
      return Promise.resolve(createAxiosResponse({ data }));
    }
    return Promise.reject(createAxiosError('Not found', 404));
  });
}

/**
 * Setup mock axios to return successful response for DELETE request
 */
export function mockDelete(url: string | RegExp): void {
  mockAxios.delete.mockImplementation((requestUrl: string) => {
    if (typeof url === 'string' ? requestUrl === url : url.test(requestUrl)) {
      return Promise.resolve(createAxiosResponse({}));
    }
    return Promise.reject(createAxiosError('Not found', 404));
  });
}

/**
 * Reset all axios mocks
 */
export function resetAxiosMocks(): void {
  mockAxios.get.mockReset();
  mockAxios.post.mockReset();
  mockAxios.put.mockReset();
  mockAxios.patch.mockReset();
  mockAxios.delete.mockReset();
  mockAxios.request.mockReset();
}

/**
 * Clear axios mock call history without resetting implementations
 */
export function clearAxiosMocks(): void {
  mockAxios.get.mockClear();
  mockAxios.post.mockClear();
  mockAxios.put.mockClear();
  mockAxios.patch.mockClear();
  mockAxios.delete.mockClear();
  mockAxios.request.mockClear();
}

// ============================================================================
// Common Mock Response Patterns
// ============================================================================

/**
 * Mock responses for common activity endpoints
 */
export const activityApiMocks = {
  getByTrip: (tripId: number, activities: unknown[]) => {
    mockAxios.get.mockImplementation((url: string) => {
      if (url === `/activities/trip/${tripId}`) {
        return Promise.resolve(createAxiosResponse(activities));
      }
      return Promise.reject(createAxiosError('Not found', 404));
    });
  },
  create: (activity: unknown) => {
    mockAxios.post.mockResolvedValue(createAxiosResponse(activity));
  },
  update: (activity: unknown) => {
    mockAxios.put.mockResolvedValue(createAxiosResponse(activity));
  },
  delete: () => {
    mockAxios.delete.mockResolvedValue(createAxiosResponse({}));
  },
};

/**
 * Mock responses for common location endpoints
 */
export const locationApiMocks = {
  getByTrip: (tripId: number, locations: unknown[]) => {
    mockAxios.get.mockImplementation((url: string) => {
      if (url === `/locations/trip/${tripId}`) {
        return Promise.resolve(createAxiosResponse({ data: locations }));
      }
      if (url === '/locations/categories/list') {
        return Promise.resolve(createAxiosResponse({ data: [] }));
      }
      return Promise.reject(createAxiosError('Not found', 404));
    });
  },
  getCategories: (categories: unknown[]) => {
    mockAxios.get.mockImplementation((url: string) => {
      if (url === '/locations/categories/list') {
        return Promise.resolve(createAxiosResponse({ data: categories }));
      }
      return Promise.reject(createAxiosError('Not found', 404));
    });
  },
  create: (location: unknown) => {
    mockAxios.post.mockResolvedValue(createAxiosResponse({ data: location }));
  },
  update: (location: unknown) => {
    mockAxios.put.mockResolvedValue(createAxiosResponse({ data: location }));
  },
  delete: () => {
    mockAxios.delete.mockResolvedValue(createAxiosResponse({}));
  },
};

/**
 * Mock responses for user endpoints
 */
export const userApiMocks = {
  getMe: (user: unknown) => {
    mockAxios.get.mockImplementation((url: string) => {
      if (url === '/users/me') {
        return Promise.resolve(createAxiosResponse(user));
      }
      return Promise.reject(createAxiosError('Not found', 404));
    });
  },
};

/**
 * Mock responses for entity link endpoints
 */
export const entityLinkApiMocks = {
  getLinksFrom: (links: unknown[]) => {
    mockAxios.get.mockImplementation((url: string) => {
      if (url.includes('/links/from/')) {
        return Promise.resolve(createAxiosResponse(links));
      }
      return Promise.reject(createAxiosError('Not found', 404));
    });
  },
  getTripSummary: (summary: unknown) => {
    mockAxios.get.mockImplementation((url: string) => {
      if (url.includes('/links/summary')) {
        return Promise.resolve(createAxiosResponse(summary));
      }
      return Promise.reject(createAxiosError('Not found', 404));
    });
  },
  createLink: (link: unknown) => {
    mockAxios.post.mockResolvedValue(createAxiosResponse(link));
  },
  deleteLink: () => {
    mockAxios.delete.mockResolvedValue(createAxiosResponse({}));
  },
};

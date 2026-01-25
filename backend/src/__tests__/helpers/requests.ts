/**
 * Request test helpers for Travel Life application backend controller tests
 *
 * Provides utilities for creating mock Express request/response objects
 * and common test patterns for controller testing.
 */

import { jest } from '@jest/globals';
import { testUsers, TestUser } from '../fixtures/users';
import { JwtPayload } from '../../types/auth.types';
import { generateTestAccessToken, createAuthenticatedUser } from './auth';

/**
 * Extended Request type with user property
 */
export interface AuthenticatedRequest {
  user: JwtPayload;
  body: Record<string, unknown>;
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  file?: MulterFile;
  files?: MulterFile[];
  method: string;
  path: string;
  baseUrl: string;
  originalUrl: string;
  ip: string;
  cookies: Record<string, string>;
  get: (name: string) => string | undefined;
}

/**
 * Multer file type (simplified for testing)
 */
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination: string;
  filename: string;
  path: string;
  stream: unknown;
}

/**
 * Mock Response type with jest mock functions
 */
export interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  sendStatus: jest.Mock;
  redirect: jest.Mock;
  setHeader: jest.Mock;
  getHeader: jest.Mock;
  cookie: jest.Mock;
  clearCookie: jest.Mock;
  download: jest.Mock;
  end: jest.Mock;
  type: jest.Mock;
  locals: Record<string, unknown>;
}

/**
 * Mock Next function type
 */
export type MockNextFunction = jest.Mock;

/**
 * Create a mock Express request object
 */
export const createMockRequest = (options: {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  user?: JwtPayload;
  file?: MulterFile;
  files?: MulterFile[];
  method?: string;
  path?: string;
  baseUrl?: string;
  originalUrl?: string;
  ip?: string;
  cookies?: Record<string, string>;
} = {}): Partial<AuthenticatedRequest> => {
  const defaultHeaders: Record<string, string> = {};

  // Add authorization header if user is provided
  if (options.user) {
    const token = generateTestAccessToken({ id: options.user.id, email: options.user.email });
    defaultHeaders.authorization = `Bearer ${token}`;
  }

  return {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: { ...defaultHeaders, ...options.headers },
    user: options.user,
    file: options.file,
    files: options.files,
    method: options.method || 'GET',
    path: options.path || '/',
    baseUrl: options.baseUrl || '/api',
    originalUrl: options.originalUrl || '/api/',
    ip: options.ip || '127.0.0.1',
    cookies: options.cookies || {},
    get: jest.fn((name: string) => {
      const headers = { ...defaultHeaders, ...options.headers };
      return headers[name.toLowerCase()];
    }) as unknown as (name: string) => string | undefined,
  };
};

/**
 * Create a mock Express response object
 */
export const createMockResponse = (): MockResponse => {
  const res: MockResponse = {
    status: jest.fn().mockReturnThis() as jest.Mock,
    json: jest.fn().mockReturnThis() as jest.Mock,
    send: jest.fn().mockReturnThis() as jest.Mock,
    sendStatus: jest.fn().mockReturnThis() as jest.Mock,
    redirect: jest.fn().mockReturnThis() as jest.Mock,
    setHeader: jest.fn().mockReturnThis() as jest.Mock,
    getHeader: jest.fn() as jest.Mock,
    cookie: jest.fn().mockReturnThis() as jest.Mock,
    clearCookie: jest.fn().mockReturnThis() as jest.Mock,
    download: jest.fn() as jest.Mock,
    end: jest.fn().mockReturnThis() as jest.Mock,
    type: jest.fn().mockReturnThis() as jest.Mock,
    locals: {},
  };

  return res;
};

/**
 * Create a mock next function
 */
export const createMockNext = (): MockNextFunction => {
  return jest.fn() as MockNextFunction;
};

/**
 * Create a complete set of mock request, response, and next for controller tests
 */
export const createMockControllerArgs = (options: {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  user?: JwtPayload;
  file?: MulterFile;
  files?: MulterFile[];
} = {}) => {
  const req = createMockRequest(options);
  const res = createMockResponse();
  const next = createMockNext();

  return { req, res, next };
};

/**
 * Create mock request/response for authenticated user
 */
export const createAuthenticatedControllerArgs = (
  user: TestUser | { id: number; email: string } = testUsers.user1,
  options: {
    body?: Record<string, unknown>;
    params?: Record<string, string>;
    query?: Record<string, string>;
  } = {}
) => {
  const authUser = createAuthenticatedUser(user);
  return createMockControllerArgs({
    ...options,
    user: authUser,
  });
};

/**
 * Create mock request/response for unauthenticated request
 */
export const createUnauthenticatedControllerArgs = (options: {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string>;
} = {}) => {
  return createMockControllerArgs(options);
};

/**
 * Create a mock Multer file object
 */
export const createMockFile = (options: {
  fieldname?: string;
  originalname?: string;
  encoding?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
} = {}): MulterFile => ({
  fieldname: options.fieldname || 'file',
  originalname: options.originalname || 'test-image.jpg',
  encoding: options.encoding || '7bit',
  mimetype: options.mimetype || 'image/jpeg',
  size: options.size || 1024 * 100, // 100KB default
  buffer: options.buffer || Buffer.from('fake-image-data'),
  destination: options.destination || '/tmp/uploads',
  filename: options.filename || 'test-image-123.jpg',
  path: options.path || '/tmp/uploads/test-image-123.jpg',
  stream: undefined,
});

/**
 * Create a mock photo upload file
 */
export const createMockPhotoFile = (options: {
  originalname?: string;
  mimetype?: string;
  size?: number;
} = {}): MulterFile => {
  return createMockFile({
    fieldname: 'photo',
    originalname: options.originalname || 'photo.jpg',
    mimetype: options.mimetype || 'image/jpeg',
    size: options.size || 1024 * 500, // 500KB
    filename: `photo-${Date.now()}.jpg`,
  });
};

/**
 * Create a mock video upload file
 */
export const createMockVideoFile = (options: {
  originalname?: string;
  mimetype?: string;
  size?: number;
} = {}): MulterFile => {
  return createMockFile({
    fieldname: 'video',
    originalname: options.originalname || 'video.mp4',
    mimetype: options.mimetype || 'video/mp4',
    size: options.size || 1024 * 1024 * 10, // 10MB
    filename: `video-${Date.now()}.mp4`,
  });
};

/**
 * Response JSON type for assertions
 */
interface JsonResponse {
  status: string;
  data?: unknown;
  message?: string;
}

/**
 * Error type for next() assertions
 */
interface AppErrorLike {
  message?: string;
  statusCode?: number;
}

/**
 * Helper to verify successful JSON response
 */
export const expectSuccessResponse = (
  res: MockResponse,
  expectedStatus: number = 200,
  expectedData?: unknown
) => {
  expect(res.status).toHaveBeenCalledWith(expectedStatus);
  expect(res.json).toHaveBeenCalled();

  if (expectedData !== undefined) {
    const jsonCall = res.json.mock.calls[0][0] as JsonResponse;
    expect(jsonCall).toMatchObject({
      status: 'success',
      data: expectedData,
    });
  } else {
    const jsonCall = res.json.mock.calls[0][0] as JsonResponse;
    expect(jsonCall.status).toBe('success');
  }
};

/**
 * Helper to verify error response
 */
export const expectErrorResponse = (
  res: MockResponse,
  expectedStatus: number,
  expectedMessage?: string
) => {
  expect(res.status).toHaveBeenCalledWith(expectedStatus);
  expect(res.json).toHaveBeenCalled();

  const jsonCall = res.json.mock.calls[0][0] as JsonResponse;
  expect(jsonCall.status).toBe('error');

  if (expectedMessage) {
    expect(jsonCall.message).toBe(expectedMessage);
  }
};

/**
 * Helper to verify next was called with error
 */
export const expectNextCalledWithError = (
  next: MockNextFunction,
  expectedMessage?: string,
  expectedStatusCode?: number
) => {
  expect(next).toHaveBeenCalled();
  const error = next.mock.calls[0][0] as AppErrorLike;
  expect(error).toBeDefined();

  if (expectedMessage) {
    expect(error.message).toBe(expectedMessage);
  }

  if (expectedStatusCode) {
    expect(error.statusCode).toBe(expectedStatusCode);
  }
};

/**
 * Helper to verify controller called response methods correctly
 */
export const expectNoResponseSent = (res: MockResponse) => {
  expect(res.status).not.toHaveBeenCalled();
  expect(res.json).not.toHaveBeenCalled();
  expect(res.send).not.toHaveBeenCalled();
};

/**
 * Common request scenarios for testing
 */
export const requestScenarios = {
  // GET requests
  getById: (id: string | number, user?: JwtPayload) =>
    createMockControllerArgs({
      params: { id: String(id) },
      user,
    }),

  getList: (query: Record<string, string> = {}, user?: JwtPayload) =>
    createMockControllerArgs({
      query,
      user,
    }),

  // POST requests
  create: (body: Record<string, unknown>, user?: JwtPayload) =>
    createMockControllerArgs({
      body,
      user,
    }),

  // PUT/PATCH requests
  update: (id: string | number, body: Record<string, unknown>, user?: JwtPayload) =>
    createMockControllerArgs({
      params: { id: String(id) },
      body,
      user,
    }),

  // DELETE requests
  delete: (id: string | number, user?: JwtPayload) =>
    createMockControllerArgs({
      params: { id: String(id) },
      user,
    }),

  // Nested resource requests
  getNestedById: (parentId: string | number, childId: string | number, user?: JwtPayload) =>
    createMockControllerArgs({
      params: { parentId: String(parentId), id: String(childId) },
      user,
    }),

  createNested: (parentId: string | number, body: Record<string, unknown>, user?: JwtPayload) =>
    createMockControllerArgs({
      params: { parentId: String(parentId) },
      body,
      user,
    }),
};

/**
 * Create request for trip-scoped resources
 */
export const createTripScopedRequest = (
  tripId: number,
  options: {
    body?: Record<string, unknown>;
    params?: Record<string, string>;
    query?: Record<string, string>;
    user?: JwtPayload;
  } = {}
) => {
  return createMockControllerArgs({
    ...options,
    params: { tripId: String(tripId), ...options.params },
  });
};

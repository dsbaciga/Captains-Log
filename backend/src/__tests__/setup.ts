// Test setup file
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Set longer timeout for integration tests
jest.setTimeout(10000);

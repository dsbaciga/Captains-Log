/**
 * Test user data fixtures for Travel Life application backend tests
 */

export interface TestUser {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl: string | null;
  timezone: string | null;
  activityCategories: Array<{ name: string; emoji: string }>;
  immichApiUrl: string | null;
  immichApiKey: string | null;
  weatherApiKey: string | null;
  aviationstackApiKey: string | null;
  openrouteserviceApiKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Default activity categories (same as in Prisma schema)
const defaultActivityCategories = [
  { name: 'Sightseeing', emoji: '🏛️' },
  { name: 'Dining', emoji: '🍽️' },
  { name: 'Adventure', emoji: '🧗' },
  { name: 'Entertainment', emoji: '🎭' },
  { name: 'Shopping', emoji: '🛍️' },
  { name: 'Recreation', emoji: '⚽' },
  { name: 'Cultural', emoji: '🏛️' },
  { name: 'Sports', emoji: '🏅' },
  { name: 'Wellness', emoji: '🧘' },
  { name: 'Tour', emoji: '👥' },
  { name: 'Other', emoji: '📌' },
];

export const testUsers: Record<string, TestUser> = {
  user1: {
    id: 1,
    username: 'testuser1',
    email: 'test1@example.com',
    passwordHash: '$2b$10$hashedpassword1', // Not a real hash
    avatarUrl: null,
    timezone: 'America/New_York',
    activityCategories: defaultActivityCategories,
    immichApiUrl: null,
    immichApiKey: null,
    weatherApiKey: null,
    aviationstackApiKey: null,
    openrouteserviceApiKey: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
  user2: {
    id: 2,
    username: 'testuser2',
    email: 'test2@example.com',
    passwordHash: '$2b$10$hashedpassword2',
    avatarUrl: 'https://example.com/avatar2.jpg',
    timezone: 'Europe/London',
    activityCategories: defaultActivityCategories,
    immichApiUrl: null,
    immichApiKey: null,
    weatherApiKey: null,
    aviationstackApiKey: null,
    openrouteserviceApiKey: null,
    createdAt: new Date('2024-01-02T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
  },
  userWithImmich: {
    id: 3,
    username: 'immichuser',
    email: 'immich@example.com',
    passwordHash: '$2b$10$hashedpassword3',
    avatarUrl: null,
    timezone: 'America/Los_Angeles',
    activityCategories: defaultActivityCategories,
    immichApiUrl: 'http://localhost:2283',
    immichApiKey: 'test-immich-api-key',
    weatherApiKey: 'test-weather-api-key',
    aviationstackApiKey: 'test-aviationstack-api-key',
    openrouteserviceApiKey: 'test-openrouteservice-api-key',
    createdAt: new Date('2024-01-03T00:00:00Z'),
    updatedAt: new Date('2024-01-03T00:00:00Z'),
  },
};

/**
 * Create a test user with optional overrides
 */
export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  ...testUsers.user1,
  ...overrides,
});

/**
 * Create a minimal user for authentication responses
 */
export const createAuthUser = (user: TestUser = testUsers.user1) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  avatarUrl: user.avatarUrl,
});

/**
 * Valid registration input
 */
export const validRegistrationInput = {
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'Password123!',
};

/**
 * Valid login input
 */
export const validLoginInput = {
  email: testUsers.user1.email,
  password: 'testpassword123',
};

/**
 * Invalid inputs for validation testing
 */
export const invalidUserInputs = {
  shortUsername: {
    username: 'ab', // Too short (min 3)
    email: 'valid@example.com',
    password: 'ValidPass123!',
  },
  invalidEmail: {
    username: 'validuser',
    email: 'not-an-email',
    password: 'ValidPass123!',
  },
  shortPassword: {
    username: 'validuser',
    email: 'valid@example.com',
    password: 'short', // Too short (min 8)
  },
};

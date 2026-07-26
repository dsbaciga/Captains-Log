// Mock the database config to avoid actual DB connections
jest.mock('../../../config/database', () => ({
  __esModule: true,
  default: {},
}));

import { verifyEntityAccess } from '../tripAccess';

describe('tripAccess', () => {
  describe('verifyEntityAccess', () => {
    it('should return entity if access is granted', async () => {
      const entity = {
        id: 1,
        name: 'Test',
        trip: { userId: 5 },
      };

      const result = await verifyEntityAccess(entity, 5, 'Activity');

      expect(result).toBe(entity);
    });
  });
});

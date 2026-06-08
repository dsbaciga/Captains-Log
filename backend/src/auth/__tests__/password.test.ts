import { hashPassword, comparePassword } from '../password';

describe('Password utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should create different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should hash empty string', async () => {
      const hash = await hashPassword('');

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword(password, hash);

      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword(wrongPassword, hash);

      expect(isMatch).toBe(false);
    });

    it('should return false for empty password against hash', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword('', hash);

      expect(isMatch).toBe(false);
    });

    it('should handle case-sensitive password comparison', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      const isMatchCorrectCase = await comparePassword('TestPassword123', hash);
      const isMatchWrongCase = await comparePassword('testpassword123', hash);

      expect(isMatchCorrectCase).toBe(true);
      expect(isMatchWrongCase).toBe(false);
    });
  });
});

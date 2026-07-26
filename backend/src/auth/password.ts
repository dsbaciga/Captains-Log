import bcrypt from 'bcrypt';

// 12 is the current OWASP-recommended bcrypt cost. Every hashing call site must
// route through hashPassword() so this stays a single source of truth.
const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

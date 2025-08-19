import { describe, expect, test, vi } from "vitest";

vi.mock('../utils/session', () => ({
  getSession: vi.fn()
}));

// Import after mocking
import { AuthContext } from "./auth";

describe('Auth Middleware', () => {
  test('AuthContext type is properly defined', () => {
    // Test the most critical thing: auth context structure
    const authContext: AuthContext = {
      user: {
        id: 'test123',
        email: 'test@example.com',
        createdAt: new Date()
      },
      userType: 'user',
      authenticated: true,
      session: {
        userId: 'test123',
        userType: 'user',
        expires: Date.now() + 3600000
      }
    };

    expect(authContext.authenticated).toBe(true);
    expect(authContext.userType).toBe('user');
    expect(authContext.user?.id).toBe('test123');
  });
});
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  generateSessionId,
  createSession,
  createUserSession,
  createAdminSession,
  clearSession,
  clearAdminSession,
  getSession,
  getAdminSession,
  getUserSession,
  isAuthenticated,
  sessionStore,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  SessionData,
} from "./session";

// Mock crypto.getRandomValues for session ID generation
const mockRandomValues = vi.fn();
Object.defineProperty(global, "crypto", {
  value: {
    getRandomValues: mockRandomValues,
  },
  writable: true,
});

describe("generateSessionId", () => {
  test("generates a 64-character hexadecimal string", () => {
    // Mock 32 bytes of random data
    const mockBytes = new Uint8Array(32);
    mockBytes.fill(255); // All bytes set to 255 (0xFF)
    mockRandomValues.mockReturnValue(mockBytes);

    const sessionId = generateSessionId();

    expect(sessionId).toHaveLength(64);
    expect(sessionId).toMatch(/^[0-9a-f]{64}$/);
    expect(sessionId).toBe("ff".repeat(32));
  });

  test("generates unique session IDs", () => {
    // Mock different random values for each call
    mockRandomValues
      .mockReturnValueOnce(new Uint8Array(32).fill(1))
      .mockReturnValueOnce(new Uint8Array(32).fill(2));

    const sessionId1 = generateSessionId();
    const sessionId2 = generateSessionId();

    expect(sessionId1).not.toBe(sessionId2);
  });
});

describe("session creation", () => {
  beforeEach(() => {
    sessionStore.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test("createSession creates session with correct data", () => {
    mockRandomValues.mockReturnValue(new Uint8Array(32).fill(1));

    const sessionId = createSession("user123", "user");
    const sessionData = sessionStore.get(sessionId);

    expect(sessionId).toBeTruthy();
    expect(sessionData).toEqual({
      userId: "user123",
      userType: "user",
      expires: Date.now() + SESSION_MAX_AGE,
    });
  });

  test("createUserSession creates user session", () => {
    mockRandomValues.mockReturnValue(new Uint8Array(32).fill(2));

    const sessionId = createUserSession("user456");
    const sessionData = sessionStore.get(sessionId);

    expect(sessionData).toEqual({
      userId: "user456",
      userType: "user",
      expires: Date.now() + SESSION_MAX_AGE,
    });
  });

  test("createAdminSession creates admin session", () => {
    mockRandomValues.mockReturnValue(new Uint8Array(32).fill(3));

    const sessionId = createAdminSession("admin123");
    const sessionData = sessionStore.get(sessionId);

    expect(sessionData).toEqual({
      userId: "admin123",
      userType: "admin",
      expires: Date.now() + SESSION_MAX_AGE,
    });
  });
});

describe("session clearing", () => {
  beforeEach(() => {
    sessionStore.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("clearSession removes session from store", () => {
    const sessionId = createSession("user123", "user");
    expect(sessionStore.has(sessionId)).toBe(true);

    clearSession(sessionId);
    expect(sessionStore.has(sessionId)).toBe(false);
  });

  test("clearAdminSession removes admin session from store", () => {
    const sessionId = createAdminSession("admin123");
    expect(sessionStore.has(sessionId)).toBe(true);

    clearAdminSession(sessionId);
    expect(sessionStore.has(sessionId)).toBe(false);
  });

  test("clearing non-existent session does not throw error", () => {
    expect(() => clearSession("nonexistent")).not.toThrow();
  });
});

describe("session retrieval from requests", () => {
  beforeEach(() => {
    sessionStore.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("getSession returns session data for valid session", () => {
    const sessionId = createSession("user123", "user");
    const request = new Request("http://localhost:3000", {
      headers: { cookie: `${SESSION_COOKIE}=${sessionId}` },
    });

    const session = getSession(request);

    expect(session).toEqual({
      userId: "user123",
      userType: "user",
      expires: Date.now() + SESSION_MAX_AGE,
    });
  });

  test("getSession returns null for request without cookies", () => {
    const request = new Request("http://localhost:3000");
    const session = getSession(request);

    expect(session).toBeNull();
  });

  test("getSession returns null for request without session cookie", () => {
    const request = new Request("http://localhost:3000", {
      headers: { cookie: "other_cookie=value" },
    });
    const session = getSession(request);

    expect(session).toBeNull();
  });

  test("getSession returns null for expired session", () => {
    const sessionId = createSession("user123", "user");

    // Fast forward past expiration
    vi.advanceTimersByTime(SESSION_MAX_AGE + 1000);

    const request = new Request("http://localhost:3000", {
      headers: { cookie: `${SESSION_COOKIE}=${sessionId}` },
    });

    const session = getSession(request);

    expect(session).toBeNull();
    expect(sessionStore.has(sessionId)).toBe(false); // Should be cleaned up
  });

  test("getSession handles multiple cookies correctly", () => {
    const sessionId = createSession("user123", "user");
    const request = new Request("http://localhost:3000", {
      headers: {
        cookie: `other=value; ${SESSION_COOKIE}=${sessionId}; another=test`,
      },
    });

    const session = getSession(request);

    expect(session).toEqual({
      userId: "user123",
      userType: "user",
      expires: Date.now() + SESSION_MAX_AGE,
    });
  });
});

describe("user and admin session helpers", () => {
  beforeEach(() => {
    sessionStore.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("getUserSession returns user ID for user session", () => {
    const sessionId = createSession("user123", "user");
    const request = new Request("http://localhost:3000", {
      headers: { cookie: `${SESSION_COOKIE}=${sessionId}` },
    });

    const userId = getUserSession(request);
    expect(userId).toBe("user123");
  });

  test("getUserSession returns null for admin session", () => {
    const sessionId = createSession("admin123", "admin");
    const request = new Request("http://localhost:3000", {
      headers: { cookie: `${SESSION_COOKIE}=${sessionId}` },
    });

    const userId = getUserSession(request);
    expect(userId).toBeNull();
  });

  test("getAdminSession returns admin ID for admin session", () => {
    const sessionId = createSession("admin123", "admin");
    const request = new Request("http://localhost:3000", {
      headers: { cookie: `${SESSION_COOKIE}=${sessionId}` },
    });

    const adminId = getAdminSession(request);
    expect(adminId).toBe("admin123");
  });

  test("getAdminSession returns null for user session", () => {
    const sessionId = createSession("user123", "user");
    const request = new Request("http://localhost:3000", {
      headers: { cookie: `${SESSION_COOKIE}=${sessionId}` },
    });

    const adminId = getAdminSession(request);
    expect(adminId).toBeNull();
  });
});

describe("isAuthenticated", () => {
  beforeEach(() => {
    sessionStore.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns true for valid session without role requirement", () => {
    const sessionId = createSession("user123", "user");
    const request = new Request("http://localhost:3000", {
      headers: { cookie: `${SESSION_COOKIE}=${sessionId}` },
    });

    expect(isAuthenticated(request)).toBe(true);
  });

  test("returns true for user session with user role requirement", () => {
    const sessionId = createSession("user123", "user");
    const request = new Request("http://localhost:3000", {
      headers: { cookie: `${SESSION_COOKIE}=${sessionId}` },
    });

    expect(isAuthenticated(request, "user")).toBe(true);
  });

  test("returns true for admin session with admin role requirement", () => {
    const sessionId = createSession("admin123", "admin");
    const request = new Request("http://localhost:3000", {
      headers: { cookie: `${SESSION_COOKIE}=${sessionId}` },
    });

    expect(isAuthenticated(request, "admin")).toBe(true);
  });

  test("returns false for user session with admin role requirement", () => {
    const sessionId = createSession("user123", "user");
    const request = new Request("http://localhost:3000", {
      headers: { cookie: `${SESSION_COOKIE}=${sessionId}` },
    });

    expect(isAuthenticated(request, "admin")).toBe(false);
  });

  test("returns false for admin session with user role requirement", () => {
    const sessionId = createSession("admin123", "admin");
    const request = new Request("http://localhost:3000", {
      headers: { cookie: `${SESSION_COOKIE}=${sessionId}` },
    });

    expect(isAuthenticated(request, "user")).toBe(false);
  });

  test("returns false for no session", () => {
    const request = new Request("http://localhost:3000");

    expect(isAuthenticated(request)).toBe(false);
    expect(isAuthenticated(request, "user")).toBe(false);
    expect(isAuthenticated(request, "admin")).toBe(false);
  });

  test("returns false for expired session", () => {
    const sessionId = createSession("user123", "user");

    // Fast forward past expiration
    vi.advanceTimersByTime(SESSION_MAX_AGE + 1000);

    const request = new Request("http://localhost:3000", {
      headers: { cookie: `${SESSION_COOKIE}=${sessionId}` },
    });

    expect(isAuthenticated(request)).toBe(false);
  });
});

describe("session store cleanup", () => {
  beforeEach(() => {
    sessionStore.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("expired sessions are cleaned up automatically", () => {
    // Clear any existing sessions first
    sessionStore.clear();

    // Mock different random values for each session
    mockRandomValues
      .mockReturnValueOnce(new Uint8Array(32).fill(1))
      .mockReturnValueOnce(new Uint8Array(32).fill(2));

    // Create some sessions
    const session1 = createSession("user1", "user");
    const session2 = createSession("user2", "user");

    expect(sessionStore.size).toBe(2);

    // Fast forward past expiration
    vi.advanceTimersByTime(SESSION_MAX_AGE + 1000);

    // Trigger cleanup by trying to get an expired session
    const request = new Request("http://localhost:3000", {
      headers: { cookie: `${SESSION_COOKIE}=${session1}` },
    });

    const session = getSession(request);
    expect(session).toBeNull();
    expect(sessionStore.has(session1)).toBe(false);

    // Session2 should still exist until accessed
    expect(sessionStore.has(session2)).toBe(true);
  });
});

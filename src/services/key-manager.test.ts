import { describe, test, expect, beforeEach, vi } from "vitest";
import { createKeyFromPassword } from "../services/encryption-service";

// Mock IndexedDB operations for consistent testing
vi.mock("./key-storage", () => ({
  storeEncryptionKey: vi.fn(),
  retrieveEncryptionKey: vi.fn(),
  removeEncryptionKey: vi.fn(),
  isKeyStorageAvailable: vi.fn().mockReturnValue(true),
}));

import { KeyManager } from "./key-manager";
import * as keyStorage from "./key-storage";

// Get the mocked functions with proper typing
const mockedKeyStorage = vi.mocked(keyStorage);

describe("KeyManager", () => {
  let testKey: CryptoKey;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { key } = await createKeyFromPassword("test123", "user456");
    testKey = key;
  });

  describe("when configured with IndexedDB strategy", () => {
    let keyManager: KeyManager;

    beforeEach(() => {
      keyManager = new KeyManager("indexeddb");
    });

    test("should store and retrieve encryption key using IndexedDB", async () => {
      mockedKeyStorage.storeEncryptionKey.mockResolvedValue(undefined);
      mockedKeyStorage.retrieveEncryptionKey.mockResolvedValue(testKey);

      await keyManager.setKey(testKey, "user456");
      const retrievedKey = await keyManager.getKey("user456");

      expect(mockedKeyStorage.storeEncryptionKey).toHaveBeenCalledWith(
        testKey,
        "user456",
      );
      expect(mockedKeyStorage.retrieveEncryptionKey).toHaveBeenCalledWith(
        "user456",
      );
      expect(retrievedKey).toBe(testKey);
    });

    test("should return null for non-existent key using IndexedDB", async () => {
      mockedKeyStorage.retrieveEncryptionKey.mockResolvedValue(null);

      const key = await keyManager.getKey("nonexistent");

      expect(mockedKeyStorage.retrieveEncryptionKey).toHaveBeenCalledWith(
        "nonexistent",
      );
      expect(key).toBeNull();
    });

    test("should remove key successfully using IndexedDB", async () => {
      mockedKeyStorage.storeEncryptionKey.mockResolvedValue(undefined);
      mockedKeyStorage.removeEncryptionKey.mockResolvedValue(undefined);

      // First set a key
      mockedKeyStorage.retrieveEncryptionKey.mockResolvedValue(testKey);
      await keyManager.setKey(testKey, "user456");

      // Then remove it
      await keyManager.removeKey("user456");

      // After removal, it should return null
      mockedKeyStorage.retrieveEncryptionKey.mockResolvedValue(null);
      const key = await keyManager.getKey("user456");

      expect(mockedKeyStorage.removeEncryptionKey).toHaveBeenCalledWith(
        "user456",
      );
      expect(key).toBeNull();
    });

    test("should report availability correctly for IndexedDB", () => {
      expect(keyManager.isAvailable()).toBe(true);
      expect(mockedKeyStorage.isKeyStorageAvailable).toHaveBeenCalled();
    });
  });

  describe("when configured with memory strategy", () => {
    let keyManager: KeyManager;

    beforeEach(() => {
      keyManager = new KeyManager("memory");
    });

    test("should store and retrieve encryption key using memory", async () => {
      await keyManager.setKey(testKey, "user456");
      const retrievedKey = await keyManager.getKey("user456");
      expect(retrievedKey).toBe(testKey);
    });

    test("should return null for non-existent key using memory", async () => {
      const key = await keyManager.getKey("nonexistent");
      expect(key).toBeNull();
    });

    test("should isolate keys between different KeyManager instances using memory", async () => {
      const manager1 = new KeyManager("memory");
      const manager2 = new KeyManager("memory");

      await manager1.setKey(testKey, "user456");
      const retrievedKey = await manager2.getKey("user456");
      expect(retrievedKey).toBeNull();
    });

    test("should report availability correctly for memory", () => {
      expect(keyManager.isAvailable()).toBe(true);
    });
  });

  describe("interface consistency", () => {
    test("should provide identical interface regardless of storage strategy", async () => {
      const indexedDBManager = new KeyManager("indexeddb");
      const memoryManager = new KeyManager("memory");

      // Both should have the same interface
      expect(typeof indexedDBManager.getKey).toBe("function");
      expect(typeof indexedDBManager.setKey).toBe("function");
      expect(typeof indexedDBManager.removeKey).toBe("function");
      expect(typeof indexedDBManager.isAvailable).toBe("function");

      expect(typeof memoryManager.getKey).toBe("function");
      expect(typeof memoryManager.setKey).toBe("function");
      expect(typeof memoryManager.removeKey).toBe("function");
      expect(typeof memoryManager.isAvailable).toBe("function");
    });
  });

  describe("error handling", () => {
    test("should throw error for unknown storage strategy", () => {
      expect(() => {
        new KeyManager("unknown" as any);
      }).toThrow("Unknown storage strategy: unknown");
    });

    test("should throw error when trying to set null key", async () => {
      const keyManager = new KeyManager("memory");
      await expect(keyManager.setKey(null as any, "user456")).rejects.toThrow(
        "Encryption key cannot be null or undefined",
      );
    });

    test("should return strategy name correctly", () => {
      const indexedDBManager = new KeyManager("indexeddb");
      const memoryManager = new KeyManager("memory");

      expect(indexedDBManager.getStrategy()).toBe("indexeddb");
      expect(memoryManager.getStrategy()).toBe("memory");
    });
  });
});

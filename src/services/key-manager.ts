import {
  storeEncryptionKey,
  retrieveEncryptionKey,
  removeEncryptionKey,
  isKeyStorageAvailable,
} from "./key-storage";

export type KeyStorageStrategy = "indexeddb" | "memory";

/**
 * Interface for managing encryption keys with different storage strategies
 */
export interface IKeyManager {
  getKey(userId?: string): Promise<CryptoKey | null>;
  setKey(key: CryptoKey, userId?: string): Promise<void>;
  removeKey(userId?: string): Promise<void>;
  isAvailable(): boolean;
}

/**
 * Storage strategy interface for internal implementations
 */
interface IKeyStorage {
  getKey(userId?: string): Promise<CryptoKey | null>;
  setKey(key: CryptoKey, userId?: string): Promise<void>;
  removeKey(userId?: string): Promise<void>;
  isAvailable(): boolean;
}

/**
 * IndexedDB storage strategy implementation
 * Wraps existing key-storage functions for IndexedDB operations
 */
class IndexedDBStorage implements IKeyStorage {
  async getKey(userId?: string): Promise<CryptoKey | null> {
    try {
      return await retrieveEncryptionKey(userId);
    } catch (error) {
      console.error("IndexedDBStorage: Failed to retrieve key:", error);
      return null;
    }
  }

  async setKey(key: CryptoKey, userId?: string): Promise<void> {
    try {
      await storeEncryptionKey(key, userId);
    } catch (error) {
      console.error("IndexedDBStorage: Failed to store key:", error);
      throw new Error("Failed to store encryption key in IndexedDB");
    }
  }

  async removeKey(userId?: string): Promise<void> {
    try {
      await removeEncryptionKey(userId);
    } catch (error) {
      console.error("IndexedDBStorage: Failed to remove key:", error);
      throw new Error("Failed to remove encryption key from IndexedDB");
    }
  }

  isAvailable(): boolean {
    return isKeyStorageAvailable();
  }
}

/**
 * In-memory storage strategy implementation
 * Provides simple in-memory key storage for testing and development
 */
class MemoryStorage implements IKeyStorage {
  private keys = new Map<string, CryptoKey>();

  async getKey(userId = "default"): Promise<CryptoKey | null> {
    return this.keys.get(userId) || null;
  }

  async setKey(key: CryptoKey, userId = "default"): Promise<void> {
    this.keys.set(userId, key);
  }

  async removeKey(userId = "default"): Promise<void> {
    this.keys.delete(userId);
  }

  isAvailable(): boolean {
    return true;
  }
}

/**
 * KeyManager implementation using strategy pattern
 * Provides consistent interface for key management across different storage strategies
 */
export class KeyManager implements IKeyManager {
  private storage: IKeyStorage;
  private strategy: KeyStorageStrategy;

  constructor(strategy: KeyStorageStrategy) {
    this.strategy = strategy;
    this.storage = this.createStorage(strategy);
  }

  /**
   * Factory method to create storage strategy implementations
   */
  private createStorage(strategy: KeyStorageStrategy): IKeyStorage {
    switch (strategy) {
      case "indexeddb":
        return new IndexedDBStorage();
      case "memory":
        return new MemoryStorage();
      default:
        throw new Error(`Unknown storage strategy: ${strategy}`);
    }
  }

  async getKey(userId?: string): Promise<CryptoKey | null> {
    return this.storage.getKey(userId);
  }

  async setKey(key: CryptoKey, userId?: string): Promise<void> {
    if (!key) {
      throw new Error("Encryption key cannot be null or undefined");
    }
    return this.storage.setKey(key, userId);
  }

  async removeKey(userId?: string): Promise<void> {
    return this.storage.removeKey(userId);
  }

  isAvailable(): boolean {
    return this.storage.isAvailable();
  }

  /**
   * Get the current storage strategy
   */
  getStrategy(): KeyStorageStrategy {
    return this.strategy;
  }
}

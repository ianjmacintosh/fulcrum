import { describe, it, expect, beforeEach } from "vitest";
import {
  generateSalt,
  deriveKey,
  encryptData,
  decryptData,
  encryptString,
  decryptString,
  createEncryptionKey,
} from "./client-crypto";

describe("Client-side encryption utilities", () => {
  describe("Salt generation", () => {
    it("should generate a 32-byte salt", async () => {
      const salt = await generateSalt();
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(32);
    });

    it("should generate different salts on each call", async () => {
      const salt1 = await generateSalt();
      const salt2 = await generateSalt();
      expect(salt1).not.toEqual(salt2);
    });
  });

  describe("Key derivation", () => {
    it("should derive a CryptoKey from password and salt", async () => {
      const password = "test-password-123";
      const salt = await generateSalt();

      const key = await deriveKey(password, salt);
      expect(key).toBeInstanceOf(CryptoKey);
      expect(key.algorithm.name).toBe("AES-GCM");
      expect(key.algorithm.length).toBe(256);
      expect(key.extractable).toBe(false);
      expect(key.usages).toContain("encrypt");
      expect(key.usages).toContain("decrypt");
    });

    it("should derive the same key from same password and salt", async () => {
      const password = "test-password-123";
      const salt = await generateSalt();

      const key1 = await deriveKey(password, salt);
      const key2 = await deriveKey(password, salt);

      // Keys should be functionally equivalent (test by encrypting/decrypting)
      const testData = "test data";
      const encrypted = await encryptString(testData, key1);
      const decrypted = await decryptString(encrypted, key2);
      expect(decrypted).toBe(testData);
    });

    it("should derive different keys from different passwords", async () => {
      const salt = await generateSalt();

      const key1 = await deriveKey("password1", salt);
      const key2 = await deriveKey("password2", salt);

      // Keys should be different (test by encrypting with one, failing to decrypt with other)
      const testData = "test data";
      const encrypted = await encryptString(testData, key1);

      await expect(decryptString(encrypted, key2)).rejects.toThrow();
    });

    it("should derive different keys from different salts", async () => {
      const password = "test-password-123";
      const salt1 = await generateSalt();
      const salt2 = await generateSalt();

      const key1 = await deriveKey(password, salt1);
      const key2 = await deriveKey(password, salt2);

      // Keys should be different (test by encrypting with one, failing to decrypt with other)
      const testData = "test data";
      const encrypted = await encryptString(testData, key1);

      await expect(decryptString(encrypted, key2)).rejects.toThrow();
    });

    it("should use sufficient iterations for PBKDF2", async () => {
      const password = "test-password-123";
      const salt = await generateSalt();

      // This test ensures we're using a reasonable number of iterations
      // by measuring time (should take at least a few milliseconds)
      const start = performance.now();
      await deriveKey(password, salt);
      const end = performance.now();

      // Should take at least 1ms (indicating sufficient iterations)
      expect(end - start).toBeGreaterThan(1);
    });
  });

  describe("String encryption/decryption", () => {
    let key: CryptoKey;

    beforeEach(async () => {
      const password = "test-password-123";
      const salt = await generateSalt();
      key = await deriveKey(password, salt);
    });

    it("should encrypt and decrypt strings correctly", async () => {
      const plaintext = "Hello, World!";

      const encrypted = await encryptString(plaintext, key);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
      expect(encrypted).not.toBe(plaintext);

      const decrypted = await decryptString(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it("should handle empty strings", async () => {
      const plaintext = "";

      const encrypted = await encryptString(plaintext, key);
      const decrypted = await decryptString(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it("should handle unicode strings", async () => {
      const plaintext = "Hello 🌍! Ñoño café";

      const encrypted = await encryptString(plaintext, key);
      const decrypted = await decryptString(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertext for same plaintext", async () => {
      const plaintext = "Hello, World!";

      const encrypted1 = await encryptString(plaintext, key);
      const encrypted2 = await encryptString(plaintext, key);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same plaintext
      const decrypted1 = await decryptString(encrypted1, key);
      const decrypted2 = await decryptString(encrypted2, key);
      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });

    it("should fail to decrypt with wrong key", async () => {
      const plaintext = "Hello, World!";
      const wrongKey = await createEncryptionKey();

      const encrypted = await encryptString(plaintext, key);

      await expect(decryptString(encrypted, wrongKey)).rejects.toThrow();
    });

    it("should fail to decrypt tampered ciphertext", async () => {
      const plaintext = "Hello, World!";

      const encrypted = await encryptString(plaintext, key);
      const tampered = encrypted.slice(0, -4) + "FAKE";

      await expect(decryptString(tampered, key)).rejects.toThrow();
    });
  });

  describe("Object encryption/decryption", () => {
    let key: CryptoKey;

    beforeEach(async () => {
      const password = "test-password-123";
      const salt = await generateSalt();
      key = await deriveKey(password, salt);
    });

    it("should encrypt and decrypt objects correctly", async () => {
      const data = { name: "John Doe", age: 30, active: true };

      const encrypted = await encryptData(data, key);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");

      const decrypted = await decryptData(encrypted, key);
      expect(decrypted).toEqual(data);
    });

    it("should handle nested objects", async () => {
      const data = {
        user: { name: "John", details: { age: 30, city: "NYC" } },
        items: ["apple", "banana"],
      };

      const encrypted = await encryptData(data, key);
      const decrypted = await decryptData(encrypted, key);
      expect(decrypted).toEqual(data);
    });

    it("should handle null and undefined values", async () => {
      const data = { name: "John", age: null, address: undefined };

      const encrypted = await encryptData(data, key);
      const decrypted = await decryptData(encrypted, key);
      expect(decrypted).toEqual(data);
    });

    it("should handle dates as ISO strings", async () => {
      const date = new Date("2023-12-25T10:30:00.000Z");
      const data = { eventDate: date.toISOString() };

      const encrypted = await encryptData(data, key);
      const decrypted = await decryptData(encrypted, key);
      expect(decrypted).toEqual(data);
    });
  });

  describe("Key creation", () => {
    it("should create a valid AES-GCM key", async () => {
      const key = await createEncryptionKey();

      expect(key).toBeInstanceOf(CryptoKey);
      expect(key.algorithm.name).toBe("AES-GCM");
      expect(key.algorithm.length).toBe(256);
      expect(key.extractable).toBe(false);
      expect(key.usages).toContain("encrypt");
      expect(key.usages).toContain("decrypt");
    });

    it("should create different keys on each call", async () => {
      const key1 = await createEncryptionKey();
      const key2 = await createEncryptionKey();

      // Keys should be different (test by encrypting with one, failing to decrypt with other)
      const testData = "test data";
      const encrypted = await encryptString(testData, key1);

      await expect(decryptString(encrypted, key2)).rejects.toThrow();
    });
  });

  describe("Error handling", () => {
    it("should throw error for invalid password in deriveKey", async () => {
      const salt = await generateSalt();

      await expect(deriveKey("", salt)).rejects.toThrow();
    });

    it("should throw error for invalid encrypted string", async () => {
      const key = await createEncryptionKey();

      await expect(
        decryptString("invalid-encrypted-string", key),
      ).rejects.toThrow();
    });

    it("should throw error for invalid encrypted data", async () => {
      const key = await createEncryptionKey();

      await expect(
        decryptData("invalid-encrypted-data", key),
      ).rejects.toThrow();
    });
  });
});

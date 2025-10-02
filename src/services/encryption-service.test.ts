import { describe, it, expect, beforeEach } from "vitest";
import {
  createKeyFromPassword,
  encryptFields,
  decryptFields,
  isDataEncrypted,
  ENCRYPTED_FIELDS,
} from "./encryption-service";
import {
  createEncryptionKey,
  encryptString,
  decryptString,
} from "../utils/client-crypto";
import type { ApplicationCreateData } from "../db/schemas";

describe("Encryption Service", () => {
  let testKey: CryptoKey;

  beforeEach(async () => {
    testKey = await createEncryptionKey();
  });

  describe("Key Creation", () => {
    it("should create key from password and user ID", async () => {
      const password = "test-password-123";
      const userId = "user-123";

      const { key, salt } = await createKeyFromPassword(password, userId);

      expect(salt).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 pattern
      expect(salt.length).toBeGreaterThan(10);
      expect(key).toBeInstanceOf(CryptoKey);
    });

    it("should create same key for same user ID and password", async () => {
      const password = "test-password-123";
      const userId = "user-123";

      // First key creation
      const { key: key1, salt: salt1 } = await createKeyFromPassword(
        password,
        userId,
      );

      // Second key creation with same password and user ID
      const { key: key2, salt: salt2 } = await createKeyFromPassword(
        password,
        userId,
      );

      // Should produce identical salt and functionally equivalent keys
      expect(salt1).toBe(salt2);

      // Test that keys work the same way by encrypting/decrypting
      const testData = "test string";
      const encrypted1 = await encryptString(testData, key1);
      const decrypted2 = await decryptString(encrypted1, key2);
      expect(decrypted2).toBe(testData);
    });

    it("should throw error with empty password", async () => {
      await expect(createKeyFromPassword("", "user-123")).rejects.toThrow(
        "Password cannot be empty",
      );
    });

    it("should throw error with empty user ID", async () => {
      await expect(createKeyFromPassword("password123", "")).rejects.toThrow(
        "User ID cannot be empty",
      );
    });

    it("should create different keys for different user IDs", async () => {
      const password = "test-password-123";
      const userId1 = "user-123";
      const userId2 = "user-456";

      const { key: key1, salt: salt1 } = await createKeyFromPassword(
        password,
        userId1,
      );
      const { key: key2, salt: salt2 } = await createKeyFromPassword(
        password,
        userId2,
      );

      // Should produce different salts for different user IDs
      expect(salt1).not.toBe(salt2);

      // Keys should not be able to decrypt each other's data
      const testData = "test string";
      const encrypted1 = await encryptString(testData, key1);

      // Attempting to decrypt with wrong key should fail
      await expect(decryptString(encrypted1, key2)).rejects.toThrow();
    });
  });

  describe("Field Encryption", () => {
    it("should encrypt specified JobApplication fields", async () => {
      const applicationData: ApplicationCreateData = {
        userId: "user-123",
        companyName: "Secret Corp",
        roleName: "Senior Engineer",
        jobPostingUrl: "https://example.com/job",
        notes: "Confidential notes",
        jobBoard: { id: "board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        events: [],
        appliedDate: "2023-12-01",
        currentStatus: { id: "applied", name: "Applied" },
      };

      const encrypted = await encryptFields(
        applicationData,
        testKey,
        "JobApplication",
      );

      // Sensitive fields should be encrypted (base64 strings)
      expect(encrypted.companyName).not.toBe("Secret Corp");
      expect(encrypted.companyName).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(encrypted.roleName).not.toBe("Senior Engineer");
      expect(encrypted.roleName).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(encrypted.notes).not.toBe("Confidential notes");
      expect(encrypted.appliedDate).not.toBe("2023-12-01");

      // Non-sensitive fields should remain unchanged
      expect(encrypted.userId).toBe("user-123");
      expect(encrypted.jobBoard.name).toBe("LinkedIn");
      expect(encrypted.applicationType).toBe("cold");
    });

    it("should encrypt nested events in JobApplication", async () => {
      const applicationData: ApplicationCreateData = {
        userId: "user-123",
        companyName: "Test Corp",
        roleName: "Engineer",
        jobBoard: { id: "board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        events: [
          {
            id: "event-1",
            title: "Applied online",
            description: "Submitted application via portal",
            date: "2023-12-01T10:00:00.000Z",
          },
        ],
        currentStatus: { id: "applied", name: "Applied" },
      };

      const encrypted = await encryptFields(
        applicationData,
        testKey,
        "JobApplication",
      );

      // Event fields should be encrypted
      expect(encrypted.events[0].title).not.toBe("Applied online");
      expect(encrypted.events[0].title).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(encrypted.events[0].description).not.toBe(
        "Submitted application via portal",
      );
      expect(encrypted.events[0].date).not.toBe("2023-12-01T10:00:00.000Z");

      // Event ID should remain unchanged (not in encrypted fields list)
      expect(encrypted.events[0].id).toBe("event-1");
    });

    it("should handle Date objects by converting to ISO strings", async () => {
      const applicationData = {
        userId: "user-123",
        companyName: "Test Corp",
        createdAt: new Date("2023-12-01T10:00:00.000Z"),
        updatedAt: new Date("2023-12-01T11:00:00.000Z"),
      };

      const encrypted = await encryptFields(
        applicationData,
        testKey,
        "JobApplication",
      );

      // Dates should be encrypted as ISO strings
      expect(encrypted.createdAt).not.toBe(applicationData.createdAt);
      expect(encrypted.createdAt).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(encrypted.updatedAt).not.toBe(applicationData.updatedAt);
    });

    it("should handle null and undefined values", async () => {
      const applicationData = {
        userId: "user-123",
        companyName: "Test Corp",
        roleName: null,
        notes: undefined,
        appliedDate: "2023-12-01",
      };

      const encrypted = await encryptFields(
        applicationData,
        testKey,
        "JobApplication",
      );

      expect(encrypted.roleName).toBeNull();
      expect(encrypted.notes).toBeUndefined();
      expect(encrypted.companyName).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });
  });

  describe("Field Decryption", () => {
    it("should decrypt encrypted JobApplication fields", async () => {
      const originalData: ApplicationCreateData = {
        userId: "user-123",
        companyName: "Secret Corp",
        roleName: "Senior Engineer",
        notes: "Confidential notes",
        jobBoard: { id: "board-1", name: "LinkedIn" },
        workflow: { id: "workflow-1", name: "Standard" },
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        events: [],
        appliedDate: "2023-12-01",
        currentStatus: { id: "applied", name: "Applied" },
      };

      // First encrypt the data
      const encrypted = await encryptFields(
        originalData,
        testKey,
        "JobApplication",
      );

      // Then decrypt it
      const decrypted = await decryptFields(
        encrypted,
        testKey,
        "JobApplication",
      );

      // Should match original values
      expect(decrypted.companyName).toBe("Secret Corp");
      expect(decrypted.roleName).toBe("Senior Engineer");
      expect(decrypted.notes).toBe("Confidential notes");
      expect(decrypted.appliedDate).toBe("2023-12-01");

      // Non-sensitive fields should be unchanged
      expect(decrypted.userId).toBe("user-123");
      expect(decrypted.jobBoard.name).toBe("LinkedIn");
    });

    it("should decrypt nested events", async () => {
      const originalData = {
        userId: "user-123",
        companyName: "Test Corp",
        events: [
          {
            id: "event-1",
            title: "Applied online",
            description: "Submitted application",
            date: "2023-12-01T10:00:00.000Z",
          },
        ],
      };

      const encrypted = await encryptFields(
        originalData,
        testKey,
        "JobApplication",
      );
      const decrypted = await decryptFields(
        encrypted,
        testKey,
        "JobApplication",
      );

      expect(decrypted.events[0].title).toBe("Applied online");
      expect(decrypted.events[0].description).toBe("Submitted application");
      expect(decrypted.events[0].date).toBe("2023-12-01T10:00:00.000Z");
      expect(decrypted.events[0].id).toBe("event-1");
    });

    it("should convert ISO date strings back to Date objects for date fields", async () => {
      const originalData = {
        userId: "user-123",
        companyName: "Test Corp",
        createdAt: new Date("2023-12-01T10:00:00.000Z"),
        appliedDate: "2023-12-01", // String date, not Date object
      };

      const encrypted = await encryptFields(
        originalData,
        testKey,
        "JobApplication",
      );
      const decrypted = await decryptFields(
        encrypted,
        testKey,
        "JobApplication",
      );

      // createdAt should be converted back to Date object
      expect(decrypted.createdAt).toBeInstanceOf(Date);
      expect(decrypted.createdAt.toISOString()).toBe(
        "2023-12-01T10:00:00.000Z",
      );

      // appliedDate should remain as string (doesn't match full ISO pattern)
      expect(decrypted.appliedDate).toBe("2023-12-01");
      expect(typeof decrypted.appliedDate).toBe("string");
    });

    it("should handle mixed encrypted/unencrypted data gracefully", async () => {
      // Simulate data that has some encrypted and some unencrypted fields
      const mixedData = {
        userId: "user-123",
        companyName: "Plain Corp", // Not encrypted
        roleName: "aGVsbG8gd29ybGQ=", // Fake encrypted string (too short)
        notes:
          "TG9yZW0gaXBzdW0gZG9sb3Igc2l0IGFtZXQsIGNvbnNlY3RldHVyIGFkaXBpc2NpbmcgZWxpdC4gTnVsbGEgZmFjaWxpc2kgZGlhbSBhdCBsYWNpbmlhIGxvYm9ydGlzLg==", // Long base64 but not actually encrypted with our key
      };

      // Should not throw error, should handle gracefully
      const result = await decryptFields(mixedData, testKey, "JobApplication");

      expect(result.companyName).toBe("Plain Corp"); // Unchanged
      expect(result.userId).toBe("user-123"); // Non-sensitive field unchanged
      // Encrypted fields should either decrypt or remain unchanged if decryption fails
      expect(result.roleName).toBeDefined();
      expect(result.notes).toBeDefined();
    });
  });

  describe("Data Detection", () => {
    it("should detect encrypted data", async () => {
      const originalData = {
        userId: "user-123",
        companyName: "Secret Corp",
        roleName: "Senior Engineer",
      };

      const encrypted = await encryptFields(
        originalData,
        testKey,
        "JobApplication",
      );

      expect(isDataEncrypted(encrypted, "JobApplication")).toBe(true);
      expect(isDataEncrypted(originalData, "JobApplication")).toBe(false);
    });

    it("should not detect short base64 strings as encrypted", () => {
      const shortBase64Data = {
        userId: "user-123",
        companyName: "aGVsbG8=", // Short base64, shouldn't be detected as encrypted
        roleName: "Engineer",
      };

      expect(isDataEncrypted(shortBase64Data, "JobApplication")).toBe(false);
    });

    it("should check actual encrypted data length and detection", async () => {
      const testData = {
        companyName: "TestCorp",
        roleName: "Engineer",
        notes: "Short",
      };

      const encrypted = await encryptFields(
        testData,
        testKey,
        "JobApplication",
      );

      // Log the actual encrypted lengths to understand what we're working with
      console.log("Encrypted data lengths:", {
        companyName: encrypted.companyName?.length,
        roleName: encrypted.roleName?.length,
        notes: encrypted.notes?.length,
        companyNameValue: encrypted.companyName?.substring(0, 20) + "...",
        roleNameValue: encrypted.roleName?.substring(0, 20) + "...",
        notesValue: encrypted.notes?.substring(0, 20) + "...",
      });

      // Verify that even short original strings create detectable encrypted data
      expect(isDataEncrypted(encrypted, "JobApplication")).toBe(true);

      // Verify individual encrypted fields are long enough to be detected
      expect(encrypted.companyName?.length).toBeGreaterThan(20);
      expect(encrypted.roleName?.length).toBeGreaterThan(20);
      expect(encrypted.notes?.length).toBeGreaterThan(20);
    });
  });

  describe("Entity Types", () => {
    it("should have correct encrypted fields for JobApplication", () => {
      const fields = ENCRYPTED_FIELDS.JobApplication;
      expect(fields).toContain("companyName");
      expect(fields).toContain("roleName");
      expect(fields).toContain("appliedDate");
      expect(fields).not.toContain("userId");
    });

    it("should have correct encrypted fields for ApplicationEvent", () => {
      const fields = ENCRYPTED_FIELDS.ApplicationEvent;
      expect(fields).toContain("title");
      expect(fields).toContain("description");
      expect(fields).toContain("date");
      expect(fields).not.toContain("id");
    });

    it("should have correct encrypted fields for User", () => {
      const fields = ENCRYPTED_FIELDS.User;
      expect(fields).toContain("name");
      expect(fields).not.toContain("email"); // Email stays unencrypted for auth
    });
  });
});

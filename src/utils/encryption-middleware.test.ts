import { describe, it, expect, beforeEach } from "vitest";
import {
  EncryptionMiddleware,
  createUserEncryptionSalt,
} from "./encryption-middleware";
import { createEncryptionKey } from "./client-crypto";
import { JobApplication, ApplicationEvent } from "../db/schemas";

describe("EncryptionMiddleware", () => {
  let middleware: EncryptionMiddleware;
  let encryptionKey: CryptoKey;

  beforeEach(async () => {
    encryptionKey = await createEncryptionKey();
    middleware = new EncryptionMiddleware(encryptionKey);
  });

  describe("Field configuration", () => {
    it("should have correct encryption fields for JobApplication", () => {
      const config = middleware.getFieldConfig("JobApplication");
      expect(config).toEqual([
        "companyName",
        "roleName",
        "jobPostingUrl",
        "notes",
        "appliedDate",
        "phoneScreenDate",
        "round1Date",
        "round2Date",
        "acceptedDate",
        "declinedDate",
        "createdAt",
        "updatedAt",
      ]);
    });

    it("should have correct encryption fields for ApplicationEvent", () => {
      const config = middleware.getFieldConfig("ApplicationEvent");
      expect(config).toEqual(["title", "description", "date"]);
    });

    it("should have correct encryption fields for User", () => {
      const config = middleware.getFieldConfig("User");
      expect(config).toEqual(["name", "createdAt", "updatedAt"]);
    });

    it("should have correct encryption fields for JobBoard", () => {
      const config = middleware.getFieldConfig("JobBoard");
      expect(config).toEqual(["name", "url", "description", "createdAt"]);
    });
  });

  describe("Data encryption", () => {
    it("should encrypt sensitive fields in JobApplication", async () => {
      const application: Partial<JobApplication> = {
        userId: "user123",
        companyName: "Tech Corp",
        roleName: "Senior Engineer",
        jobPostingUrl: "https://example.com/job",
        notes: "Great company culture",
        appliedDate: "2023-12-01T00:00:00.000Z",
        phoneScreenDate: "2023-12-05T00:00:00.000Z",
        createdAt: new Date("2023-11-30T00:00:00.000Z"),
        updatedAt: new Date("2023-12-01T00:00:00.000Z"),
      };

      const encrypted = await middleware.encryptForStorage(
        application,
        "JobApplication",
      );

      // Non-sensitive fields should remain unchanged
      expect(encrypted.userId).toBe("user123");

      // Sensitive fields should be encrypted (different from original)
      expect(encrypted.companyName).toBeDefined();
      expect(encrypted.companyName).not.toBe("Tech Corp");
      expect(encrypted.roleName).toBeDefined();
      expect(encrypted.roleName).not.toBe("Senior Engineer");
      expect(encrypted.jobPostingUrl).toBeDefined();
      expect(encrypted.jobPostingUrl).not.toBe("https://example.com/job");
      expect(encrypted.notes).toBeDefined();
      expect(encrypted.notes).not.toBe("Great company culture");

      // Date fields should be encrypted as ISO strings
      expect(encrypted.appliedDate).toBeDefined();
      expect(encrypted.appliedDate).not.toBe("2023-12-01T00:00:00.000Z");
      expect(encrypted.createdAt).toBeDefined();
      expect(encrypted.createdAt).not.toBe(
        (application.createdAt as Date)?.toISOString(),
      );
    });

    it("should handle optional fields correctly", async () => {
      const application: Partial<JobApplication> = {
        userId: "user123",
        companyName: "Tech Corp",
        roleName: "Senior Engineer",
        // jobPostingUrl and notes are undefined
      };

      const encrypted = await middleware.encryptForStorage(
        application,
        "JobApplication",
      );

      expect(encrypted.userId).toBe("user123");
      expect(encrypted.companyName).toBeDefined();
      expect(encrypted.roleName).toBeDefined();
      expect(encrypted.jobPostingUrl).toBeUndefined();
      expect(encrypted.notes).toBeUndefined();
    });

    it("should encrypt nested events in JobApplication", async () => {
      const events: ApplicationEvent[] = [
        {
          id: "event1",
          title: "Applied online",
          description: "Submitted application via company website",
          date: "2023-12-01T00:00:00.000Z",
        },
        {
          id: "event2",
          title: "Phone screen scheduled",
          date: "2023-12-05T00:00:00.000Z",
        },
      ];

      const application: Partial<JobApplication> = {
        userId: "user123",
        companyName: "Tech Corp",
        events,
      };

      const encrypted = await middleware.encryptForStorage(
        application,
        "JobApplication",
      );

      expect(encrypted.events).toHaveLength(2);
      expect(encrypted.events![0].id).toBe("event1"); // ID not encrypted
      expect(encrypted.events![0].title).not.toBe("Applied online");
      expect(encrypted.events![0].description).not.toBe(
        "Submitted application via company website",
      );
      expect(encrypted.events![0].date).not.toBe("2023-12-01T00:00:00.000Z");
      expect(encrypted.events![1].id).toBe("event2");
      expect(encrypted.events![1].title).not.toBe("Phone screen scheduled");
    });
  });

  describe("Data decryption", () => {
    it("should decrypt sensitive fields in JobApplication", async () => {
      const original: Partial<JobApplication> = {
        userId: "user123",
        companyName: "Tech Corp",
        roleName: "Senior Engineer",
        jobPostingUrl: "https://example.com/job",
        notes: "Great company culture",
        appliedDate: "2023-12-01T00:00:00.000Z",
        createdAt: new Date("2023-11-30T00:00:00.000Z"),
      };

      const encrypted = await middleware.encryptForStorage(
        original,
        "JobApplication",
      );
      const decrypted = await middleware.decryptFromStorage(
        encrypted,
        "JobApplication",
      );

      expect(decrypted.userId).toBe("user123");
      expect(decrypted.companyName).toBe("Tech Corp");
      expect(decrypted.roleName).toBe("Senior Engineer");
      expect(decrypted.jobPostingUrl).toBe("https://example.com/job");
      expect(decrypted.notes).toBe("Great company culture");
      expect(decrypted.appliedDate).toBe("2023-12-01T00:00:00.000Z");

      // Date objects should be restored
      expect(decrypted.createdAt).toBeInstanceOf(Date);
      expect((decrypted.createdAt as Date)?.toISOString()).toBe(
        "2023-11-30T00:00:00.000Z",
      );
    });

    it("should handle nested events decryption", async () => {
      const events: ApplicationEvent[] = [
        {
          id: "event1",
          title: "Applied online",
          description: "Submitted application via company website",
          date: "2023-12-01T00:00:00.000Z",
        },
      ];

      const original: Partial<JobApplication> = {
        userId: "user123",
        companyName: "Tech Corp",
        events,
      };

      const encrypted = await middleware.encryptForStorage(
        original,
        "JobApplication",
      );
      const decrypted = await middleware.decryptFromStorage(
        encrypted,
        "JobApplication",
      );

      expect(decrypted.events).toHaveLength(1);
      expect(decrypted.events![0].id).toBe("event1");
      expect(decrypted.events![0].title).toBe("Applied online");
      expect(decrypted.events![0].description).toBe(
        "Submitted application via company website",
      );
      expect(decrypted.events![0].date).toBe("2023-12-01T00:00:00.000Z");
    });

    it("should handle optional fields in decryption", async () => {
      const original: Partial<JobApplication> = {
        userId: "user123",
        companyName: "Tech Corp",
        roleName: "Senior Engineer",
      };

      const encrypted = await middleware.encryptForStorage(
        original,
        "JobApplication",
      );
      const decrypted = await middleware.decryptFromStorage(
        encrypted,
        "JobApplication",
      );

      expect(decrypted.userId).toBe("user123");
      expect(decrypted.companyName).toBe("Tech Corp");
      expect(decrypted.roleName).toBe("Senior Engineer");
      expect(decrypted.jobPostingUrl).toBeUndefined();
      expect(decrypted.notes).toBeUndefined();
    });
  });

  describe("Encryption detection", () => {
    it("should detect unencrypted data", () => {
      const unencrypted = { companyName: "Tech Corp", userId: "user123" };
      expect(middleware.isEncrypted(unencrypted, "JobApplication")).toBe(false);
    });

    it("should detect encrypted data", async () => {
      const original = { companyName: "Tech Corp", userId: "user123" };
      const encrypted = await middleware.encryptForStorage(
        original,
        "JobApplication",
      );
      expect(middleware.isEncrypted(encrypted, "JobApplication")).toBe(true);
    });

    it("should handle mixed encryption state", async () => {
      const partiallyEncrypted = {
        companyName: "encrypted_data_here",
        userId: "user123", // Not encrypted
        _encrypted: true,
      };
      expect(middleware.isEncrypted(partiallyEncrypted, "JobApplication")).toBe(
        true,
      );
    });
  });

  describe("User salt management", () => {
    it("should create and validate user encryption salt", () => {
      const saltData = createUserEncryptionSalt();

      expect(saltData).toHaveProperty("salt");
      expect(saltData).toHaveProperty("saltString");
      expect(saltData.salt).toBeInstanceOf(Uint8Array);
      expect(saltData.salt.length).toBe(32);
      expect(typeof saltData.saltString).toBe("string");
    });

    it("should create different salts for different users", () => {
      const salt1 = createUserEncryptionSalt();
      const salt2 = createUserEncryptionSalt();

      expect(salt1.saltString).not.toBe(salt2.saltString);
      expect(salt1.salt).not.toEqual(salt2.salt);
    });
  });

  describe("Error handling", () => {
    it("should handle decryption errors gracefully", async () => {
      const invalidEncrypted = {
        companyName: "invalid_encrypted_data",
        _encrypted: true,
        userId: "user123",
      };

      await expect(
        middleware.decryptFromStorage(invalidEncrypted, "JobApplication"),
      ).rejects.toThrow();
    });

    it("should throw error for unknown entity type", () => {
      expect(() => {
        middleware.getFieldConfig("UnknownEntity" as any);
      }).toThrow("Unknown entity type: UnknownEntity");
    });
  });
});

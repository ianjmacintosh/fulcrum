/**
 * Client-side encryption utilities (functional approach)
 * Provides pure functions for field-level encryption/decryption with explicit control.
 * Application code decides when and what to encrypt.
 */

import {
  deriveKey,
  generateSalt,
  encryptString,
  decryptString,
  saltToString,
  saltFromString,
} from "../utils/client-crypto";

// Define which fields should be encrypted for each entity type
export const ENCRYPTED_FIELDS = {
  JobApplication: [
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
  ],
  ApplicationEvent: ["title", "description", "date"],
  User: [
    "name",
    "createdAt",
    "updatedAt",
    // email remains unencrypted for authentication
  ],
} as const;

export type EntityType = keyof typeof ENCRYPTED_FIELDS;

/**
 * Create encryption key from user password using user ID as salt
 * @param password User's password
 * @param userId User's ID to use as salt base
 * @returns Promise resolving to { key, salt } where salt is derived from user ID
 */
export async function createKeyFromPassword(
  password: string,
  userId: string,
): Promise<{ key: CryptoKey; salt: string }> {
  if (!password || password.length === 0) {
    throw new Error("Password cannot be empty");
  }

  if (!userId || userId.length === 0) {
    throw new Error("User ID cannot be empty");
  }

  // Create a consistent salt from user ID
  // Hash the user ID to create a fixed-length salt
  const encoder = new TextEncoder();
  const userIdBytes = encoder.encode(userId);
  const saltBytes = await crypto.subtle.digest("SHA-256", userIdBytes);

  // Use first 16 bytes as salt (128 bits)
  const salt = new Uint8Array(saltBytes.slice(0, 16));

  // Derive encryption key from password and user-ID-based salt
  const key = await deriveKey(password, salt);

  // Return key and salt as string for storage
  return { key, salt: saltToString(salt) };
}

/**
 * Encrypt sensitive fields in an object
 * @param data Object to encrypt
 * @param key Encryption key
 * @param entityType Type of entity (determines which fields to encrypt)
 * @returns Promise resolving to object with encrypted fields
 */
export async function encryptFields<T extends Record<string, any>>(
  data: T,
  key: CryptoKey,
  entityType: EntityType,
): Promise<T> {
  const fieldsToEncrypt = ENCRYPTED_FIELDS[entityType];
  const result = { ...data } as any;

  // Encrypt specified fields
  for (const field of fieldsToEncrypt) {
    if (result[field] != null) {
      const value = result[field];

      // Convert dates to ISO strings before encryption
      const stringValue =
        value instanceof Date ? value.toISOString() : String(value);

      result[field] = await encryptString(stringValue, key);
    }
  }

  // Recursively encrypt nested objects (like events array)
  if (
    entityType === "JobApplication" &&
    "events" in result &&
    Array.isArray(result.events)
  ) {
    result.events = await Promise.all(
      result.events.map(
        async (event: any) =>
          await encryptFields(event, key, "ApplicationEvent"),
      ),
    );
  }

  return result;
}

/**
 * Decrypt sensitive fields in an object
 * @param data Object to decrypt
 * @param key Decryption key
 * @param entityType Type of entity (determines which fields to decrypt)
 * @returns Promise resolving to object with decrypted fields
 */
export async function decryptFields<T extends Record<string, any>>(
  data: T,
  key: CryptoKey,
  entityType: EntityType,
): Promise<T> {
  const fieldsToDecrypt = ENCRYPTED_FIELDS[entityType];
  const result = { ...data } as any;

  // Decrypt specified fields
  for (const field of fieldsToDecrypt) {
    if (result[field] != null && typeof result[field] === "string") {
      try {
        // Try to decrypt the field
        const decryptedValue = await decryptString(result[field], key);

        // For specific timestamp fields, convert back to Date if they look like ISO strings
        if (
          (field === "createdAt" || field === "updatedAt") &&
          decryptedValue.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/)
        ) {
          result[field] = new Date(decryptedValue);
        } else {
          result[field] = decryptedValue;
        }
      } catch (error) {
        // If decryption fails, assume field is not encrypted (backward compatibility)
        // This handles mixed encrypted/unencrypted data during migration
        console.warn(
          `Failed to decrypt field ${field}, assuming unencrypted:`,
          error,
        );
      }
    }
  }

  // Recursively decrypt nested objects (like events array)
  if (
    entityType === "JobApplication" &&
    "events" in result &&
    Array.isArray(result.events)
  ) {
    result.events = await Promise.all(
      result.events.map(
        async (event: any) =>
          await decryptFields(event, key, "ApplicationEvent"),
      ),
    );
  }

  return result;
}

/**
 * Check if data appears to be encrypted (has base64-like encrypted fields)
 * @param data Object to check
 * @param entityType Type of entity
 * @returns Boolean indicating if data appears encrypted
 */
export function isDataEncrypted(
  data: Record<string, any>,
  entityType: EntityType,
): boolean {
  const fieldsToCheck = ENCRYPTED_FIELDS[entityType];

  // Check if any sensitive field looks like base64 encrypted data
  for (const field of fieldsToCheck) {
    if (data[field] && typeof data[field] === "string") {
      const value = data[field] as string;
      // Check if it looks like base64 (and is long enough to be encrypted)
      if (value.match(/^[A-Za-z0-9+/]+=*$/) && value.length > 50) {
        return true;
      }
    }
  }

  return false;
}

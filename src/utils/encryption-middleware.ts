/**
 * Encryption middleware for database operations
 * Handles automatic encryption/decryption of sensitive fields based on entity type
 */

import {
  encryptString,
  decryptString,
  generateSalt,
  saltToString,
  saltFromString,
} from "./client-crypto";

// Define which fields should be encrypted for each entity type
export type EntityType =
  | "JobApplication"
  | "ApplicationEvent"
  | "User"
  | "JobBoard"
  | "Workflow"
  | "ApplicationStatus";

export type EncryptedFieldConfig = {
  [K in EntityType]: string[];
};

// Configuration defining which fields to encrypt for each entity
const ENCRYPTED_FIELDS: EncryptedFieldConfig = {
  JobApplication: [
    "companyName",
    "roleName",
    "jobPostingUrl",
    "notes",
    // All date fields are sensitive (job-seeking timeline)
    "appliedDate",
    "phoneScreenDate",
    "round1Date",
    "round2Date",
    "acceptedDate",
    "declinedDate",
    "createdAt",
    "updatedAt",
  ],
  ApplicationEvent: [
    "title",
    "description",
    "date", // Event timing is sensitive
  ],
  User: [
    "name", // User's real name is sensitive
    "createdAt",
    "updatedAt",
    // email remains unencrypted for authentication
  ],
  JobBoard: ["name", "url", "description", "createdAt"],
  Workflow: ["name", "description", "createdAt"],
  ApplicationStatus: ["name", "description", "createdAt"],
};

// Fields that contain nested objects/arrays that may need encryption
const NESTED_FIELD_CONFIGS: Partial<
  Record<EntityType, Record<string, EntityType>>
> = {
  JobApplication: {
    events: "ApplicationEvent",
  },
};

/**
 * Encryption middleware class that handles automatic encryption/decryption
 * of sensitive fields based on entity type configuration
 */
export class EncryptionMiddleware {
  constructor(private encryptionKey: CryptoKey) {}

  /**
   * Get the list of fields to encrypt for a given entity type
   * @param entityType - The type of entity
   * @returns Array of field names to encrypt
   */
  getFieldConfig(entityType: EntityType): string[] {
    const config = ENCRYPTED_FIELDS[entityType];
    if (!config) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }
    return config;
  }

  /**
   * Encrypt data before storing in database
   * @param data - The data object to encrypt
   * @param entityType - The type of entity being encrypted
   * @returns Promise resolving to data with encrypted fields
   */
  async encryptForStorage<T extends Record<string, any>>(
    data: T,
    entityType: EntityType,
  ): Promise<T> {
    const fieldsToEncrypt = this.getFieldConfig(entityType);
    const encrypted = { ...data };

    // Encrypt specified fields
    for (const field of fieldsToEncrypt) {
      if (data[field] !== undefined && data[field] !== null) {
        const value = data[field];

        // Handle Date objects by converting to ISO string
        const stringValue =
          value instanceof Date ? value.toISOString() : String(value);
        encrypted[field] = await encryptString(stringValue, this.encryptionKey);
      }
    }

    // Handle nested objects/arrays
    const nestedConfigs = NESTED_FIELD_CONFIGS[entityType];
    if (nestedConfigs) {
      for (const [field, nestedEntityType] of Object.entries(nestedConfigs)) {
        if (data[field]) {
          if (Array.isArray(data[field])) {
            // Handle arrays of nested objects
            encrypted[field] = await Promise.all(
              data[field].map((item: any) =>
                this.encryptForStorage(item, nestedEntityType),
              ),
            );
          } else {
            // Handle single nested object
            encrypted[field] = await this.encryptForStorage(
              data[field],
              nestedEntityType,
            );
          }
        }
      }
    }

    // Add encryption metadata
    (encrypted as any)._encrypted = true;

    return encrypted;
  }

  /**
   * Decrypt data after retrieving from database
   * @param data - The data object to decrypt
   * @param entityType - The type of entity being decrypted
   * @returns Promise resolving to data with decrypted fields
   */
  async decryptFromStorage<T extends Record<string, any>>(
    data: T,
    entityType: EntityType,
  ): Promise<T> {
    const fieldsToEncrypt = this.getFieldConfig(entityType);
    const decrypted = { ...data };

    // Decrypt specified fields
    for (const field of fieldsToEncrypt) {
      if (data[field] !== undefined && data[field] !== null) {
        try {
          const decryptedString = await decryptString(
            data[field],
            this.encryptionKey,
          );

          // Try to convert back to Date if it's a createdAt/updatedAt field
          if (
            this.isDateObjectField(field) &&
            this.isISODateString(decryptedString)
          ) {
            decrypted[field] = new Date(decryptedString);
          } else {
            decrypted[field] = decryptedString;
          }
        } catch (error) {
          throw new Error(
            `Failed to decrypt field ${field}: ${(error as Error).message}`,
          );
        }
      }
    }

    // Handle nested objects/arrays
    const nestedConfigs = NESTED_FIELD_CONFIGS[entityType];
    if (nestedConfigs) {
      for (const [field, nestedEntityType] of Object.entries(nestedConfigs)) {
        if (data[field]) {
          if (Array.isArray(data[field])) {
            // Handle arrays of nested objects
            decrypted[field] = await Promise.all(
              data[field].map((item: any) =>
                this.decryptFromStorage(item, nestedEntityType),
              ),
            );
          } else {
            // Handle single nested object
            decrypted[field] = await this.decryptFromStorage(
              data[field],
              nestedEntityType,
            );
          }
        }
      }
    }

    // Remove encryption metadata
    delete (decrypted as any)._encrypted;

    return decrypted;
  }

  /**
   * Check if data is already encrypted
   * @param data - The data to check
   * @param entityType - The type of entity
   * @returns True if data is encrypted
   */
  isEncrypted(data: Record<string, any>, entityType: EntityType): boolean {
    // Check for encryption metadata
    if (data._encrypted === true) {
      return true;
    }

    // Fallback: check if sensitive fields look encrypted (base64-ish)
    const fieldsToCheck = this.getFieldConfig(entityType);
    for (const field of fieldsToCheck) {
      const value = data[field];
      if (value && typeof value === "string") {
        // Simple heuristic: encrypted data is base64 and longer than typical plaintext
        if (this.looksLikeEncryptedData(value)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Simple heuristic to detect if a string looks like encrypted data
   * @param value - String to check
   * @returns True if it looks like base64 encrypted data
   */
  private looksLikeEncryptedData(value: string): boolean {
    // Base64 pattern and reasonable length for encrypted data
    const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
    return base64Pattern.test(value) && value.length > 50;
  }

  /**
   * Check if a field name represents a date field
   * @param fieldName - Name of the field
   * @returns True if it's a date field
   */
  private isDateField(fieldName: string): boolean {
    return (
      fieldName.includes("Date") ||
      fieldName === "createdAt" ||
      fieldName === "updatedAt"
    );
  }

  /**
   * Check if a field should be converted back to a Date object (not just stored as ISO string)
   * @param fieldName - Name of the field
   * @returns True if it should be converted to Date object
   */
  private isDateObjectField(fieldName: string): boolean {
    return fieldName === "createdAt" || fieldName === "updatedAt";
  }

  /**
   * Check if a string looks like an ISO date string
   * @param str - String to check
   * @returns True if it looks like ISO date
   */
  private isISODateString(str: string): boolean {
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return isoDatePattern.test(str) && !isNaN(Date.parse(str));
  }
}

/**
 * Create a new encryption salt for a user
 * @returns Object containing both Uint8Array salt and base64 string representation
 */
export function createUserEncryptionSalt(): {
  salt: Uint8Array;
  saltString: string;
} {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  return {
    salt,
    saltString: saltToString(salt),
  };
}

/**
 * Global encryption middleware instance (will be initialized after login)
 */
let globalMiddleware: EncryptionMiddleware | null = null;

/**
 * Initialize global encryption middleware with user's encryption key
 * @param encryptionKey - The derived encryption key for the user
 */
export function initializeEncryption(encryptionKey: CryptoKey): void {
  globalMiddleware = new EncryptionMiddleware(encryptionKey);
}

/**
 * Get the current encryption middleware instance
 * @returns The current middleware instance
 * @throws Error if encryption is not initialized
 */
export function getEncryptionMiddleware(): EncryptionMiddleware {
  if (!globalMiddleware) {
    throw new Error(
      "Encryption middleware not initialized. User must be logged in.",
    );
  }
  return globalMiddleware;
}

/**
 * Clear the global encryption middleware (call on logout)
 */
export function clearEncryption(): void {
  globalMiddleware = null;
}

/**
 * Check if encryption is currently initialized
 * @returns True if encryption is ready to use
 */
export function isEncryptionInitialized(): boolean {
  return globalMiddleware !== null;
}

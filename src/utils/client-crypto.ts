/**
 * Client-side encryption utilities using WebCrypto API
 * Provides password-based key derivation and AES-GCM encryption for sensitive user data
 */

// PBKDF2 iterations - balance between security and performance
const PBKDF2_ITERATIONS = 100000;

// Salt length in bytes
const SALT_LENGTH = 32;

// AES-GCM IV length in bytes
const IV_LENGTH = 12;

/**
 * Generate a cryptographically secure random salt
 * @returns Promise resolving to a Uint8Array salt
 */
export async function generateSalt(): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Derive an AES-GCM key from password and salt using PBKDF2
 * @param password - User's password
 * @param salt - Random salt for key derivation
 * @returns Promise resolving to a CryptoKey for AES-GCM operations
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  if (!password || password.length === 0) {
    throw new Error("Password cannot be empty");
  }

  // Convert password to ArrayBuffer
  const passwordBuffer = new TextEncoder().encode(password);

  // Import password as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  // Derive AES-GCM key using PBKDF2
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // not extractable
    ["encrypt", "decrypt"],
  );

  return key;
}

/**
 * Create a new random AES-GCM encryption key
 * @returns Promise resolving to a CryptoKey for AES-GCM operations
 */
export async function createEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // not extractable
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt a string using AES-GCM
 * @param plaintext - String to encrypt
 * @param key - AES-GCM key for encryption
 * @returns Promise resolving to base64-encoded encrypted string (IV + ciphertext)
 */
export async function encryptString(
  plaintext: string,
  key: CryptoKey,
): Promise<string> {
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Convert plaintext to ArrayBuffer
  const plaintextBuffer = new TextEncoder().encode(plaintext);

  // Encrypt using AES-GCM
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    plaintextBuffer,
  );

  // Combine IV and ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Return base64-encoded result
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a string using AES-GCM
 * @param encryptedString - Base64-encoded encrypted string (IV + ciphertext)
 * @param key - AES-GCM key for decryption
 * @returns Promise resolving to decrypted plaintext string
 */
export async function decryptString(
  encryptedString: string,
  key: CryptoKey,
): Promise<string> {
  try {
    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedString)
        .split("")
        .map((char) => char.charCodeAt(0)),
    );

    if (combined.length < IV_LENGTH) {
      throw new Error("Invalid encrypted string: too short");
    }

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    // Decrypt using AES-GCM
    const plaintextBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      ciphertext,
    );

    // Convert back to string
    return new TextDecoder().decode(plaintextBuffer);
  } catch (error) {
    throw new Error("Failed to decrypt string: " + (error as Error).message);
  }
}

/**
 * Encrypt an object/data using AES-GCM (JSON serialization + string encryption)
 * @param data - Object to encrypt
 * @param key - AES-GCM key for encryption
 * @returns Promise resolving to base64-encoded encrypted string
 */
export async function encryptData<T>(data: T, key: CryptoKey): Promise<string> {
  const jsonString = JSON.stringify(data);
  return await encryptString(jsonString, key);
}

/**
 * Decrypt data using AES-GCM (string decryption + JSON deserialization)
 * @param encryptedData - Base64-encoded encrypted string
 * @param key - AES-GCM key for decryption
 * @returns Promise resolving to decrypted object
 */
export async function decryptData<T>(
  encryptedData: string,
  key: CryptoKey,
): Promise<T> {
  try {
    const jsonString = await decryptString(encryptedData, key);
    return JSON.parse(jsonString) as T;
  } catch (error) {
    throw new Error("Failed to decrypt data: " + (error as Error).message);
  }
}

/**
 * Convert a salt to base64 string for storage
 * @param salt - Salt as Uint8Array
 * @returns Base64-encoded salt string
 */
export function saltToString(salt: Uint8Array): string {
  return btoa(String.fromCharCode(...salt));
}

/**
 * Convert a base64 salt string back to Uint8Array
 * @param saltString - Base64-encoded salt string
 * @returns Salt as Uint8Array
 */
export function saltFromString(saltString: string): Uint8Array {
  return new Uint8Array(
    atob(saltString)
      .split("")
      .map((char) => char.charCodeAt(0)),
  );
}

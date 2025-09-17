import { Page } from "@playwright/test";

const USER_PASSWORD = process.env.USER_PASSWORD || "";

/**
 * Set up encryption key in IndexedDB for E2E tests
 * Derives key from test user password and stores it for the session
 */
export async function setupEncryptionForTest(page: Page): Promise<void> {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  await page.evaluate(
    async ({ password, baseUrl }) => {
      // Fetch current user to get userId
      const response = await fetch(`${baseUrl}/api/auth/status`, {
        credentials: "include",
      });
      const data = await response.json();
      const user = data.user;
      const userId = user.id || user._id;

      if (!userId || !password) {
        throw new Error("Missing userId or password for encryption setup");
      }

      // Create salt from userId (same logic as createKeyFromPassword)
      const encoder = new TextEncoder();
      const userIdBytes = encoder.encode(userId);
      const saltBytes = await crypto.subtle.digest("SHA-256", userIdBytes);
      const salt = new Uint8Array(saltBytes.slice(0, 16));

      // Derive key
      const passwordBuffer = new TextEncoder().encode(password);
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        "PBKDF2",
        false,
        ["deriveKey"],
      );
      const key = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt as BufferSource,
          iterations: 100000,
          hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );

      // Store in IndexedDB
      const DB_NAME = "fulcrum-keys";
      const DB_VERSION = 1;
      const STORE_NAME = "cryptoKeys";
      const USER_KEY_ID = "userEncryptionKey";

      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
      });

      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(key, USER_KEY_ID);

      await new Promise<void>((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    },
    { password: USER_PASSWORD, baseUrl },
  );
}

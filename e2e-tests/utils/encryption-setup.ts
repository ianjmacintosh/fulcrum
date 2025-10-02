import { Page } from "@playwright/test";

const USER_PASSWORD = process.env.USER_PASSWORD || "followthewhiterabbit";

/**
 * Set up encryption key in IndexedDB for E2E tests
 * Derives key from test user password and stores it for the session
 */
export async function setupEncryptionForTest(page: Page): Promise<void> {
  // Check if encryption key is already set up to avoid unnecessary reloads
  const hasKey = await page.evaluate(async () => {
    try {
      const DB_NAME = "fulcrum-keys";
      const STORE_NAME = "cryptoKeys";
      const USER_KEY_ID = "userEncryptionKey";

      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
          // DB doesn't exist yet
          reject(new Error("DB doesn't exist"));
        };
      });

      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);

      // Get current user ID from auth status
      const response = await fetch("/api/auth/status", {
        credentials: "include",
      });
      const data = await response.json();
      const userId = data.user?.id || data.user?._id;

      if (!userId) return false;

      const keyId = `${USER_KEY_ID}_${userId}`;
      const request = store.get(keyId);

      return new Promise<boolean>((resolve) => {
        request.onerror = () => resolve(false);
        request.onsuccess = () => resolve(!!request.result);
      });
    } catch {
      return false;
    }
  });

  if (hasKey) {
    console.log("Encryption key already exists, skipping setup");
    return;
  }

  await page.evaluate(
    async ({ password }) => {
      // Fetch current user to get userId
      const response = await fetch("/api/auth/status", {
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
      const keyId = `${USER_KEY_ID}_${userId}`;
      const request = store.put(key, keyId);

      await new Promise<void>((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    },
    { password: USER_PASSWORD },
  );

  // After storing the key, refresh the page so AuthContext picks it up
  // Only reload if we actually set up a new key
  if (!hasKey) {
    await page.reload();
    await page.waitForLoadState("networkidle");
  }
}

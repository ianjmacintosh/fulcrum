/**
 * IndexedDB-based CryptoKey storage service
 * As per W3C Web Cryptography API spec section 5.2, CryptoKey objects
 * can be stored in IndexedDB without exposing key material to JavaScript
 */

const DB_NAME = "fulcrum-keys";
const DB_VERSION = 1;
const STORE_NAME = "cryptoKeys";
const USER_KEY_ID = "userEncryptionKey";

/**
 * Initialize IndexedDB for key storage
 */
async function initKeyStorage(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store for crypto keys
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Store a CryptoKey in IndexedDB
 * @param key The CryptoKey to store
 * @param userId Optional user identifier (defaults to current user)
 */
export async function storeEncryptionKey(
  key: CryptoKey,
  userId?: string,
): Promise<void> {
  const db = await initKeyStorage();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const keyId = userId ? `${USER_KEY_ID}_${userId}` : USER_KEY_ID;
    const request = store.put(key, keyId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Retrieve a CryptoKey from IndexedDB
 * @param userId Optional user identifier (defaults to current user)
 * @returns The stored CryptoKey or null if not found
 */
export async function retrieveEncryptionKey(
  userId?: string,
): Promise<CryptoKey | null> {
  try {
    const db = await initKeyStorage();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);

      const keyId = userId ? `${USER_KEY_ID}_${userId}` : USER_KEY_ID;
      console.log("KeyStorage: Attempting to get key with keyId:", keyId);
      const request = store.get(keyId);

      request.onerror = () => {
        console.error("KeyStorage: Request error:", request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        const result = request.result;
        console.log("KeyStorage: Raw result from IndexedDB:", result);
        console.log(
          "KeyStorage: Is result a CryptoKey?",
          result instanceof CryptoKey,
        );
        console.log("KeyStorage: Result type:", typeof result);
        if (result) {
          console.log(
            "KeyStorage: Result constructor:",
            result.constructor.name,
          );
        }
        resolve(result instanceof CryptoKey ? result : null);
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error("Failed to retrieve encryption key:", error);
    return null;
  }
}

/**
 * Remove a CryptoKey from IndexedDB
 * @param userId Optional user identifier (defaults to current user)
 */
export async function removeEncryptionKey(userId?: string): Promise<void> {
  try {
    const db = await initKeyStorage();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const keyId = userId ? `${USER_KEY_ID}_${userId}` : USER_KEY_ID;
      const request = store.delete(keyId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();

      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error("Failed to remove encryption key:", error);
  }
}

/**
 * Check if IndexedDB is available in the current environment
 */
export function isKeyStorageAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

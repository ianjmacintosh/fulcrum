# Fulcrum Services Architecture & Encryption Integration

This document explains how the ServicesProvider interfaces with MongoDB and the client-side application, and how encryption is integrated throughout the data flow.

## Architecture Overview

Fulcrum uses a **strict client-server separation** where MongoDB operations only occur on the server side, with client-side field-level encryption for sensitive user data.

### Key Components

1. **Client-Side Components**: React components, encryption services, auth context
2. **Server-Side Services**: MongoDB operations, API routes, service factory
3. **Encryption Layer**: Client-side AES-GCM encryption with password-based key derivation
4. **Data Flow**: Encrypted data stored in MongoDB, decrypted only on authorized clients

## ServicesProvider Architecture

### Current Implementation (Post-Fix)

```typescript
// src/components/ServicesProvider.tsx
export function ServicesProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

**The ServicesProvider is now a simple pass-through component** that provides no services on the client side. This is intentional because:

- MongoDB connections should never exist on the client side
- Services are instantiated server-side per request in API routes
- Client-side components interact with data via API calls, not direct database access

### Why This Design?

1. **Security**: Prevents MongoDB connection strings from being exposed to browsers
2. **Performance**: Avoids bundling large MongoDB libraries in client builds
3. **Separation of Concerns**: Clear boundary between client UI and server data layer

## MongoDB Services Layer

### Server-Side Service Factory

```typescript
// src/services/factory.ts
export async function createServices(): Promise<ServicesContext> {
  const client = new MongoClient(MONGODB_URI, { /* connection options */ });
  await client.connect();
  const db = client.db("fulcrum");

  return {
    applicationService: new ApplicationService(db),
    workflowService: new WorkflowService(db),
    jobBoardService: new JobBoardService(db),
  };
}
```

### Usage in API Routes

```typescript
// src/routes/api/applications/create.ts
export const ServerRoute = createServerFileRoute("/api/applications/create")
  .methods({
    POST: async ({ request, context }) => {
      // Services are created per request
      const services = await createServices();
      
      // Use services for database operations
      const application = await services.applicationService.createApplication(data);
      
      return createSuccessResponse({ application });
    },
  });
```

### Service Classes

Each service class encapsulates MongoDB operations for a specific domain:

- **ApplicationService**: CRUD operations for job applications
- **WorkflowService**: Manages application workflows and statuses
- **JobBoardService**: Tracks job boards and their effectiveness

## Encryption Integration

### Client-Side Field-Level Encryption

Fulcrum implements **client-side encryption** where sensitive data is encrypted before being sent to the server:

```typescript
// src/services/encryption-service.ts
export const ENCRYPTED_FIELDS = {
  JobApplication: [
    "companyName", "roleName", "jobPostingUrl", "notes",
    "appliedDate", "phoneScreenDate", "round1Date", "round2Date",
    "acceptedDate", "declinedDate", "createdAt", "updatedAt"
  ],
  ApplicationEvent: ["title", "description", "date"],
  User: ["name", "createdAt", "updatedAt"]
  // email remains unencrypted for authentication
};
```

### Encryption Process

1. **Key Derivation**: User password → PBKDF2 → AES-GCM key (client-side only)
2. **Field Encryption**: Sensitive fields encrypted individually using AES-GCM
3. **Storage**: Encrypted base64 strings stored in MongoDB
4. **Retrieval**: Data fetched via API, decrypted client-side when displayed

### Crypto Implementation

```typescript
// src/utils/client-crypto.ts
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  // PBKDF2 with 100,000 iterations
  // SHA-256 hash function
  // 256-bit AES-GCM key
}

export async function encryptString(plaintext: string, key: CryptoKey): Promise<string> {
  // AES-GCM with random 12-byte IV
  // Returns base64(IV + ciphertext)
}
```

## Data Flow Architecture

### 1. Data Creation Flow

```
[Client Form] → [Client Encryption] → [API Request] → [Server Services] → [MongoDB (Encrypted)]
```

**Example: Creating an Application**

1. User fills out application form
2. Client encrypts sensitive fields using user's derived key
3. Encrypted data sent to `/api/applications/create`
4. Server receives encrypted data, validates, stores in MongoDB
5. MongoDB contains encrypted field values

### 2. Data Retrieval Flow

```
[MongoDB (Encrypted)] → [Server Services] → [API Response] → [Client Decryption] → [React UI]
```

**Example: Loading Applications List**

1. Client requests `/api/applications/`
2. Server queries MongoDB, returns encrypted data
3. Client receives encrypted applications
4. Client decrypts fields using user's key before displaying

### 3. Authentication & Key Management

```
[Login] → [Password] → [Key Derivation] → [AuthContext] → [Encryption/Decryption]
```

**Key Derivation Process:**

1. User enters password during login
2. Client derives encryption key using PBKDF2(password, salt)
3. Key stored in memory (AuthContext) for session duration
4. Key used for all encryption/decryption operations

## Router Context Integration

### Router Context Structure

```typescript
// src/router.tsx
export interface ServicesContext {
  applicationService: ApplicationService;
  workflowService: WorkflowService;
  jobBoardService: JobBoardService;
}

export function createRouter() {
  return createTanStackRouter({
    context: {
      auth: { /* auth state */ },
      services: undefined as any, // Client-side has no services
    }
  });
}
```

### RouterAuthProvider Bridge

```typescript
// src/components/RouterAuthProvider.tsx
router.update({
  context: {
    auth: newAuthContext,
    services: (router as any).context?.services || undefined, // Safe access
  },
});
```

**Note**: The `?.` operator prevents errors when `router.context` is undefined during initial load.

## Security Model

### Encryption Security Features

1. **Password-Based Key Derivation**: PBKDF2 with 100,000 iterations
2. **Strong Encryption**: AES-GCM with 256-bit keys
3. **Random IVs**: Each encryption uses a fresh random IV
4. **Client-Side Only**: Keys never leave the browser
5. **Forward Secrecy**: Key derived from password, not stored

### Access Control

1. **Authentication**: JWT tokens for API access
2. **Authorization**: User can only access their own data
3. **Encryption**: Even if database is compromised, data remains encrypted
4. **Key Management**: Keys exist only in browser memory during session

## Error Handling & Backward Compatibility

### Mixed Encrypted/Unencrypted Data

```typescript
// During migration, some data may be encrypted, some not
export function isDataEncrypted(data: Record<string, any>, entityType: EntityType): boolean {
  const fieldsToCheck = ENCRYPTED_FIELDS[entityType];
  
  for (const field of fieldsToCheck) {
    if (data[field] && typeof data[field] === "string") {
      // Check if it looks like base64 encrypted data
      if (data[field].match(/^[A-Za-z0-9+/]+=*$/) && data[field].length > 50) {
        return true;
      }
    }
  }
  return false;
}
```

### Decryption Error Handling

```typescript
// If decryption fails, assume field is not encrypted (backward compatibility)
try {
  const decryptedValue = await decryptString(result[field], key);
  result[field] = decryptedValue;
} catch (error) {
  console.warn(`Failed to decrypt field ${field}, assuming unencrypted:`, error);
  // Field remains as-is (unencrypted)
}
```

## Performance Considerations

### Client-Side Performance

- **Encryption/Decryption**: Uses native WebCrypto API for optimal performance
- **Memory**: Keys stored in memory only, cleared on logout
- **Batch Operations**: Multiple fields encrypted/decrypted in parallel

### Server-Side Performance

- **Connection Pooling**: MongoDB connections reused via connection pool
- **Per-Request Services**: Services created per API request (stateless)
- **No Client Connections**: Prevents connection leaks and reduces server load

## Development & Testing

### Testing Encrypted Data

```typescript
// Tests can use the encryption service directly
import { encryptFields, decryptFields } from '../services/encryption-service';

const key = await createKeyFromPassword('test-password');
const encrypted = await encryptFields(testData, key, 'JobApplication');
const decrypted = await decryptFields(encrypted, key, 'JobApplication');
```

### Environment Configuration

```typescript
// src/services/factory.ts
const MONGODB_URI = 
  process.env.MONGO_URL ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  process.env.MONGO_PUBLIC_URL ||
  "mongodb://localhost:27017/fulcrum";
```

## Future Considerations

### Scalability

- **Key Rotation**: Implement periodic key rotation for enhanced security
- **Multiple Encryption Keys**: Support for different encryption keys per user/tenant
- **Bulk Decryption**: Optimize for large datasets with streaming decryption

### Enhanced Security

- **Hardware Security Modules**: Consider HSM integration for key management
- **Zero-Knowledge Architecture**: Explore server-blind encryption schemes
- **Audit Trails**: Implement encryption/decryption operation logging

---

This architecture ensures that sensitive user data remains encrypted throughout its lifecycle while maintaining clean separation between client UI concerns and server data operations.
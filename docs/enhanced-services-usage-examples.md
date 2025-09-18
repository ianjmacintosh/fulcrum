# Enhanced ServicesProvider Usage Examples

## Overview

The enhanced `ServicesProvider` provides a clean, type-safe API layer with **automatic encryption/decryption** for all sensitive data. No more scattered `fetch()` calls or manual encryption handling!

## Basic Usage

### 1. Import and Use Services

```typescript
import { useServices } from '../contexts/ServicesContext';

function ApplicationsList() {
  const { applications } = useServices();
  const [apps, setApps] = useState([]);

  useEffect(() => {
    const loadApplications = async () => {
      const { applications: appList } = await applications.list();
      setApps(appList); // Already decrypted automatically!
    };
    loadApplications();
  }, [applications]);

  return (
    <div>
      {apps.map(app => (
        <div key={app._id}>
          <h3>{app.companyName}</h3> {/* Decrypted automatically */}
          <p>{app.roleName}</p>       {/* Decrypted automatically */}
        </div>
      ))}
    </div>
  );
}
```

### 2. Creating Applications

```typescript
function CreateApplicationForm() {
  const { applications } = useServices();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const { application } = await applications.create({
        companyName: formData.companyName,
        roleName: formData.roleName,
        jobPostingUrl: formData.jobPostingUrl,
        appliedDate: formData.appliedDate,
        notes: formData.notes,
        // Sensitive fields automatically encrypted before sending!
      });

      console.log("Created:", application); // Already decrypted response!
      // Redirect or update UI
    } catch (error) {
      console.error("Failed to create application:", error);
    } finally {
      setLoading(false);
    }
  };

  // ... form JSX
}
```

### 3. Analytics Dashboard

```typescript
function DashboardMetrics() {
  const { analytics } = useServices();
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const loadMetrics = async () => {
      const { metrics } = await analytics.dashboard();
      setMetrics(metrics); // Clean, typed response
    };
    loadMetrics();
  }, [analytics]);

  return (
    <div>
      <h2>Dashboard</h2>
      {metrics && (
        <>
          <p>Total Applications: {metrics.totalApplications}</p>
          <p>Conversion Rate: {metrics.conversionRate}%</p>
        </>
      )}
    </div>
  );
}
```

## Before vs After Comparison

### BEFORE (Old scattered approach):

```typescript
// In applications/index.tsx
function Applications() {
  const { encryptionKey } = useAuth();
  const [applications, setApplications] = useState([]);
  const [decryptionError, setDecryptionError] = useState("");

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        // Manual fetch call
        const response = await fetch("/api/applications/", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch applications");
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error("Applications API returned error");
        }

        let apps = result.applications;

        // Manual encryption detection and decryption
        if (encryptionKey && apps.length > 0) {
          const hasEncryptedData = apps.some((app) =>
            isDataEncrypted(app, "JobApplication"),
          );

          if (hasEncryptedData) {
            apps = await Promise.all(
              apps.map(async (app) => {
                try {
                  return await decryptFields(
                    app,
                    encryptionKey,
                    "JobApplication",
                  );
                } catch (error) {
                  console.warn(
                    `Failed to decrypt application ${app._id}:`,
                    error,
                  );
                  return app;
                }
              }),
            );
          }
        }

        setApplications(apps);
      } catch (error) {
        console.error("Applications loader error:", error);
        setDecryptionError("Failed to load applications");
      }
    };

    fetchApplications();
  }, [encryptionKey]);

  // ... rest of component (50+ lines of boilerplate)
}
```

### AFTER (Clean service layer):

```typescript
// In applications/index.tsx
function Applications() {
  const { applications } = useServices();
  const [apps, setApps] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadApplications = async () => {
      try {
        const {
          applications: appList,
          success,
          error,
        } = await applications.list();

        if (success) {
          setApps(appList); // Automatically decrypted!
        } else {
          setError(error || "Failed to load applications");
        }
      } catch (err) {
        setError("Failed to load applications");
      }
    };

    loadApplications();
  }, [applications]);

  // ... rest of component (10 lines vs 50+)
}
```

## Available Services

### Applications Service

```typescript
const { applications } = useServices();

// List all applications (auto-decrypted)
const { applications: appList } = await applications.list();

// Create single application (auto-encrypted)
const { application } = await applications.create(applicationData);

// Bulk create applications (auto-encrypted)
const { applications: createdApps } = await applications.createBulk(appArray);

// Get specific application (auto-decrypted)
const { application } = await applications.get(applicationId);

// Update application (auto-encrypted)
const { application } = await applications.update(applicationId, updateData);

// Delete application
const { success } = await applications.delete(applicationId);

// Add event to application (auto-encrypted)
const { event } = await applications.createEvent(applicationId, eventData);
```

### Analytics Service

```typescript
const { analytics } = useServices();

// Get dashboard metrics
const { metrics } = await analytics.dashboard();

// Get projection data
const { projection } = await analytics.projection({
  startDate: "2025-01-01",
  endDate: "2025-12-31",
  targetRole: "Senior Developer",
});
```

### Job Boards Service

```typescript
const { jobBoards } = useServices();

// List job boards
const { jobBoards } = await jobBoards.list();

// Create job board
const { jobBoard } = await jobBoards.create({
  name: "LinkedIn",
  url: "https://linkedin.com/jobs",
});
```

## Automatic Encryption/Decryption

The ServicesProvider automatically handles encryption/decryption based on:

1. **User Authentication**: If user has an encryption key (logged in), encryption is enabled
2. **Data Detection**: Uses `isDataEncrypted()` to detect if data needs decryption
3. **Field-Level Encryption**: Only encrypts sensitive fields defined in `ENCRYPTED_FIELDS`
4. **Backward Compatibility**: Works with both encrypted and unencrypted data
5. **Error Handling**: Gracefully falls back if encryption/decryption fails

### Encrypted Fields

```typescript
// From encryption-service.ts
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
  User: ["name", "createdAt", "updatedAt"],
  // email remains unencrypted for authentication
};
```

## Error Handling

All service methods return a consistent response format:

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

Example error handling:

```typescript
const { applications } = useServices();

try {
  const result = await applications.create(applicationData);

  if (result.success) {
    console.log("Created:", result.application);
  } else {
    console.error("API Error:", result.error);
  }
} catch (error) {
  console.error("Network Error:", error);
}
```

## TypeScript Support

Full TypeScript support with proper interfaces:

```typescript
import {
  useServices,
  JobApplication,
  CreateApplicationData,
} from "../contexts/ServicesContext";

const { applications } = useServices(); // Fully typed!

// TypeScript knows the exact shape of the data
const handleCreate = async (data: CreateApplicationData) => {
  const result = await applications.create(data);
  // result.application is typed as JobApplication
};
```

## Migration Strategy

1. **Phase 1**: Enhanced ServicesProvider is implemented alongside existing code
2. **Phase 2**: Gradually migrate components one by one
3. **Phase 3**: Remove old fetch calls once all components use services

Start with your most complex components (like applications list/create) to see the biggest benefit immediately!

## Benefits Summary

✅ **No more scattered fetch() calls**  
✅ **Automatic encryption/decryption**  
✅ **Consistent error handling**  
✅ **Full TypeScript support**  
✅ **Easy testing (mock the entire service layer)**  
✅ **50-80% less boilerplate code**  
✅ **Centralized API logic**  
✅ **Future-proof architecture**

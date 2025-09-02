import {
  Collection,
  Db,
  InsertOneResult,
  InsertManyResult,
  FindOneAndUpdateOptions,
  ObjectId,
  FindOptions,
} from "mongodb";
import { JobApplication } from "../schemas";

/**
 * Mock database client for testing
 * Provides in-memory storage that implements the MongoDB Collection interface
 */
export class MockCollection<T = any> implements Partial<Collection<T>> {
  private storage: T[] = [];
  private idCounter = 1;

  constructor(private collectionName: string) {}

  async insertOne(doc: any): Promise<InsertOneResult<T>> {
    const id = new ObjectId(this.idCounter.toString().padStart(24, "0"));
    this.idCounter++;

    const docWithId = { ...doc, _id: id };
    this.storage.push(docWithId);

    return {
      acknowledged: true,
      insertedId: id,
    } as InsertOneResult<T>;
  }

  async insertMany(docs: any[]): Promise<InsertManyResult<T>> {
    const insertedIds: { [key: number]: ObjectId } = {};

    docs.forEach((doc, index) => {
      const id = new ObjectId(this.idCounter.toString().padStart(24, "0"));
      this.idCounter++;

      const docWithId = { ...doc, _id: id };
      this.storage.push(docWithId);
      insertedIds[index] = id;
    });

    return {
      acknowledged: true,
      insertedCount: docs.length,
      insertedIds,
    } as InsertManyResult<T>;
  }

  async findOne(filter: any): Promise<T | null> {
    return this.storage.find((doc) => this.matchesFilter(doc, filter)) || null;
  }

  find(filter: any): MockQuery<T> {
    const matchingDocs = this.storage.filter((doc) =>
      this.matchesFilter(doc, filter),
    );
    return new MockQuery(matchingDocs);
  }

  async findOneAndUpdate(
    filter: any,
    update: any,
    options?: FindOneAndUpdateOptions,
  ): Promise<T | null> {
    const docIndex = this.storage.findIndex((doc) =>
      this.matchesFilter(doc, filter),
    );
    if (docIndex === -1) return null;

    const oldDoc = this.storage[docIndex];
    const updatedDoc = { ...oldDoc, ...update.$set };
    this.storage[docIndex] = updatedDoc;

    return options?.returnDocument === "after" ? updatedDoc : oldDoc;
  }

  async deleteOne(filter: any): Promise<{ deletedCount: number }> {
    const index = this.storage.findIndex((doc) =>
      this.matchesFilter(doc, filter),
    );
    if (index !== -1) {
      this.storage.splice(index, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteMany(filter: any): Promise<{ deletedCount: number }> {
    const originalLength = this.storage.length;
    this.storage = this.storage.filter(
      (doc) => !this.matchesFilter(doc, filter),
    );
    return { deletedCount: originalLength - this.storage.length };
  }

  async countDocuments(filter: any = {}): Promise<number> {
    return this.storage.filter((doc) => this.matchesFilter(doc, filter)).length;
  }

  // Create index - no-op for mock
  async createIndex(...args: any[]): Promise<string> {
    return "mock_index";
  }

  private matchesFilter(doc: any, filter: any): boolean {
    if (!filter || Object.keys(filter).length === 0) return true;

    return Object.entries(filter).every(([key, value]) => {
      if (key.includes(".")) {
        // Handle nested field queries like "currentStatus.id"
        const keys = key.split(".");
        let docValue = doc;
        for (const k of keys) {
          docValue = docValue?.[k];
        }
        return docValue === value;
      }

      if (typeof value === "object" && value !== null) {
        // Handle operators like $in, $gte, $lte
        if ("$in" in value) {
          return value.$in.includes(doc[key]);
        }
        if ("$gte" in value && "$lte" in value) {
          const docValue = new Date(doc[key]);
          return (
            docValue >= new Date(value.$gte) && docValue <= new Date(value.$lte)
          );
        }
      }

      return doc[key] === value;
    });
  }

  // Clear storage for test cleanup
  clear(): void {
    this.storage = [];
    this.idCounter = 1;
  }
}

class MockQuery<T> {
  private docs: T[];

  constructor(docs: T[]) {
    this.docs = [...docs];
  }

  limit(count: number): MockQuery<T> {
    this.docs = this.docs.slice(0, count);
    return this;
  }

  skip(count: number): MockQuery<T> {
    this.docs = this.docs.slice(count);
    return this;
  }

  sort(sortSpec: any): MockQuery<T> {
    const [field, direction] = Object.entries(sortSpec)[0] as [string, number];
    this.docs.sort((a, b) => {
      const aVal = (a as any)[field];
      const bVal = (b as any)[field];

      let result = 0;
      if (aVal < bVal) result = -1;
      else if (aVal > bVal) result = 1;

      return direction === -1 ? -result : result;
    });
    return this;
  }

  async toArray(): Promise<T[]> {
    return this.docs;
  }
}

export class MockDb implements Partial<Db> {
  private collections = new Map<string, MockCollection>();

  collection<T = any>(name: string): MockCollection<T> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockCollection<T>(name));
    }
    return this.collections.get(name) as MockCollection<T>;
  }

  // Clear all collections for test cleanup
  clearAll(): void {
    this.collections.forEach((collection) => collection.clear());
    this.collections.clear();
  }
}

// Factory function to create a mock database
export function createMockDb(): MockDb {
  return new MockDb();
}

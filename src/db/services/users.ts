import { Db, Collection, ObjectId } from "mongodb";
import { connectToDatabase } from "../connection";
import { User, UserSchema } from "../schemas";
import { randomUUID } from "crypto";

export class UserService {
  private db: Db | null = null;
  private collection: Collection<User> | null = null;

  private async getCollection(): Promise<Collection<User>> {
    if (!this.collection) {
      this.db = await connectToDatabase();
      this.collection = this.db.collection<User>("users");

      // Create unique index on user id
      await this.collection.createIndex({ id: 1 }, { unique: true });
      await this.collection.createIndex({ email: 1 }, { unique: true });
    }
    return this.collection;
  }

  async createUser(userData: {
    email: string;
    name: string;
    hashedPassword: string;
  }): Promise<User> {
    const collection = await this.getCollection();

    const newUser: User = {
      id: randomUUID(),
      email: userData.email.toLowerCase(),
      name: userData.name,
      hashedPassword: userData.hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate with Zod
    const validationResult = UserSchema.safeParse({
      ...newUser,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    });

    if (!validationResult.success) {
      throw new Error(
        `User validation error: ${validationResult.error.message}`,
      );
    }

    try {
      const result = await collection.insertOne(newUser);
      return { ...newUser, _id: result.insertedId };
    } catch (error: any) {
      if (error.code === 11000) {
        if (error.keyPattern?.email) {
          throw new Error("Email address already exists");
        }
        if (error.keyPattern?.id) {
          throw new Error("User ID already exists");
        }
      }
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    const collection = await this.getCollection();
    return await collection.findOne({ id });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const collection = await this.getCollection();
    return await collection.findOne({ email: email.toLowerCase() });
  }

  async getAllUsers(): Promise<User[]> {
    const collection = await this.getCollection();
    return await collection.find({}).sort({ createdAt: -1 }).toArray();
  }

  async updateUser(
    id: string,
    updates: Partial<Pick<User, "email" | "name" | "hashedPassword">>,
  ): Promise<User | null> {
    const collection = await this.getCollection();

    const updateDoc = {
      ...updates,
      updatedAt: new Date(),
    };

    // Ensure email is lowercase if being updated
    if (updateDoc.email) {
      updateDoc.email = updateDoc.email.toLowerCase();
    }

    try {
      const result = await collection.findOneAndUpdate(
        { id },
        { $set: updateDoc },
        { returnDocument: "after" },
      );
      return result || null;
    } catch (error: any) {
      if (error.code === 11000 && error.keyPattern?.email) {
        throw new Error("Email address already exists");
      }
      throw error;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ id });
    return result.deletedCount === 1;
  }

  async getUserCount(): Promise<number> {
    const collection = await this.getCollection();
    return await collection.countDocuments();
  }

  // Check if user ID is available
  async isUserIdAvailable(id: string): Promise<boolean> {
    const collection = await this.getCollection();
    const user = await collection.findOne({ id });
    return user === null;
  }

  // Generate a unique user ID
  async generateUniqueUserId(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const id = randomUUID();
      if (await this.isUserIdAvailable(id)) {
        return id;
      }
      attempts++;
    }

    throw new Error("Unable to generate unique user ID after 10 attempts");
  }
}

// Export singleton instance
export const userService = new UserService();

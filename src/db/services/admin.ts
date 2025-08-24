import { Db, Collection } from "mongodb";
import { connectToDatabase } from "../connection";
import { AdminUser, AdminUserSchema } from "../schemas";

export class AdminService {
  private db: Db | null = null;
  private collection: Collection<AdminUser> | null = null;

  private async getCollection(): Promise<Collection<AdminUser>> {
    if (!this.collection) {
      this.db = await connectToDatabase();
      this.collection = this.db.collection<AdminUser>("admin_users");

      // Create unique index on username
      await this.collection.createIndex({ username: 1 }, { unique: true });
    }
    return this.collection;
  }

  async createAdminUser(
    username: string,
    hashedPassword: string,
  ): Promise<AdminUser> {
    const collection = await this.getCollection();

    const newAdmin: AdminUser = {
      username: username.toLowerCase(),
      hashedPassword,
      createdAt: new Date(),
    };

    // Validate with Zod
    const validationResult = AdminUserSchema.safeParse({
      ...newAdmin,
      createdAt: newAdmin.createdAt,
    });

    if (!validationResult.success) {
      throw new Error(
        `Admin validation error: ${validationResult.error.message}`,
      );
    }

    try {
      const result = await collection.insertOne(newAdmin);
      return { ...newAdmin, _id: result.insertedId };
    } catch (error: any) {
      if (error.code === 11000) {
        throw new Error("Admin username already exists");
      }
      throw error;
    }
  }

  async getAdminByUsername(username: string): Promise<AdminUser | null> {
    const collection = await this.getCollection();
    return await collection.findOne({ username: username.toLowerCase() });
  }

  async updateAdminPassword(
    username: string,
    hashedPassword: string,
  ): Promise<boolean> {
    const collection = await this.getCollection();

    const result = await collection.updateOne(
      { username: username.toLowerCase() },
      { $set: { hashedPassword } },
    );

    return result.modifiedCount === 1;
  }

  async deleteAdmin(username: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({
      username: username.toLowerCase(),
    });
    return result.deletedCount === 1;
  }

  async getAdminCount(): Promise<number> {
    const collection = await this.getCollection();
    return await collection.countDocuments();
  }

  // Initialize default admin if none exists
  async ensureDefaultAdmin(
    defaultUsername: string,
    defaultHashedPassword: string,
  ): Promise<void> {
    const adminCount = await this.getAdminCount();

    if (adminCount === 0) {
      console.log("🔐 Creating default admin user...");
      await this.createAdminUser(defaultUsername, defaultHashedPassword);
      console.log("✅ Default admin user created");
    }
  }
}

// Export singleton instance
export const adminService = new AdminService();

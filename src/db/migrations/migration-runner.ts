import { connectToDatabase, closeDatabaseConnection } from "./connection";
import { Db } from "mongodb";

export interface MigrationResult {
  success: boolean;
  message: string;
  documentsModified: number;
  errors: string[];
}

export interface Migration {
  id: string;
  name: string;
  description: string;
  execute: (db: Db, dryRun: boolean) => Promise<MigrationResult>;
  rollback?: (db: Db) => Promise<MigrationResult>;
}

export class MigrationRunner {
  private db: Db | null = null;
  private migrations: Migration[] = [];

  constructor(migrations: Migration[]) {
    this.migrations = migrations.sort((a, b) => a.id.localeCompare(b.id));
  }

  async connect(): Promise<void> {
    this.db = await connectToDatabase();
  }

  async hasRun(migrationId: string): Promise<boolean> {
    if (!this.db) throw new Error("Database not connected");

    const migrationsCollection = this.db.collection("_migrations");
    const result = await migrationsCollection.findOne({ migrationId });
    return result !== null;
  }

  async markAsRun(migrationId: string): Promise<void> {
    if (!this.db) throw new Error("Database not connected");

    const migrationsCollection = this.db.collection("_migrations");
    await migrationsCollection.insertOne({
      migrationId,
      runAt: new Date(),
      success: true,
    });
  }

  async runMigrations(
    dryRun: boolean = false,
    force: boolean = false,
  ): Promise<void> {
    if (!this.db) {
      await this.connect();
    }

    console.log(
      `\n🚀 Running migrations ${dryRun ? "(DRY RUN)" : ""}${force ? " (FORCED)" : ""}...`,
    );
    console.log("=".repeat(50));

    for (const migration of this.migrations) {
      const hasRun = await this.hasRun(migration.id);

      if (hasRun && !dryRun && !force) {
        console.log(`✅ ${migration.id}: ${migration.name} (already run)`);
        continue;
      }

      if (hasRun && force) {
        console.log(`⚠️  ${migration.id}: ${migration.name} (forcing re-run)`);
      }

      console.log(`\n🔄 Running: ${migration.id} - ${migration.name}`);
      console.log(`   ${migration.description}`);

      try {
        const result = await migration.execute(this.db!, dryRun);

        if (result.success) {
          console.log(`✅ Success: ${result.message}`);
          console.log(`   Documents modified: ${result.documentsModified}`);

          if (!dryRun) {
            await this.markAsRun(migration.id);
          }
        } else {
          console.log(`❌ Failed: ${result.message}`);
          if (result.errors.length > 0) {
            console.log(`   Errors:`);
            result.errors.forEach((error) => console.log(`     - ${error}`));
          }
          throw new Error(
            `Migration ${migration.id} failed: ${result.message}`,
          );
        }
      } catch (error: any) {
        console.log(`💥 Error in migration ${migration.id}:`, error.message);
        throw error;
      }
    }

    console.log(
      `\n🎉 All migrations completed successfully ${dryRun ? "(DRY RUN)" : ""}!`,
    );
  }

  async rollbackMigration(migrationId: string): Promise<void> {
    if (!this.db) {
      await this.connect();
    }

    const migration = this.migrations.find((m) => m.id === migrationId);
    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }

    if (!migration.rollback) {
      throw new Error(`Migration ${migrationId} does not support rollback`);
    }

    console.log(`\n🔄 Rolling back: ${migration.id} - ${migration.name}`);

    try {
      const result = await migration.rollback(this.db!);

      if (result.success) {
        console.log(`✅ Rollback successful: ${result.message}`);

        // Remove from migrations table
        const migrationsCollection = this.db!.collection("_migrations");
        await migrationsCollection.deleteOne({ migrationId });
      } else {
        console.log(`❌ Rollback failed: ${result.message}`);
        throw new Error(`Rollback failed: ${result.message}`);
      }
    } catch (error: any) {
      console.log(`💥 Error in rollback:`, error.message);
      throw error;
    }
  }

  async validateData(): Promise<void> {
    if (!this.db) {
      await this.connect();
    }

    console.log("\n🔍 Validating migrated data...");

    const applications = this.db!.collection("applications");
    const statuses = this.db!.collection("application_statuses");

    // Count documents
    const appCount = await applications.countDocuments();
    const statusCount = await statuses.countDocuments();

    console.log(
      `📊 Found ${appCount} applications and ${statusCount} statuses`,
    );

    // Comprehensive validation of all applications
    const allApps = await applications.find({}).toArray();
    const validationErrors: string[] = [];

    console.log("🔍 Comprehensive application structure validation:");

    // Track event format issues
    let appsWithOldEventFormat = 0;
    let appsWithNewEventFormat = 0;
    let appsWithMixedEventFormat = 0;

    for (const app of allApps) {
      if (app.events && Array.isArray(app.events) && app.events.length > 0) {
        let hasOldFormat = false;
        let hasNewFormat = false;

        for (const event of app.events) {
          // Check for old format indicators
          if (
            event.statusId ||
            event.statusName ||
            event.notes ||
            event.eventType
          ) {
            hasOldFormat = true;
          }
          // Check for new format indicators
          if (event.title && !event.statusId) {
            hasNewFormat = true;
          }
        }

        if (hasOldFormat && hasNewFormat) {
          appsWithMixedEventFormat++;
          validationErrors.push(
            `Application ${app._id}: Has mixed event formats`,
          );
        } else if (hasOldFormat) {
          appsWithOldEventFormat++;
        } else if (hasNewFormat) {
          appsWithNewEventFormat++;
        }
      }
    }

    console.log(
      `   - Applications with old event format: ${appsWithOldEventFormat}`,
    );
    console.log(
      `   - Applications with new event format: ${appsWithNewEventFormat}`,
    );
    console.log(
      `   - Applications with mixed event formats: ${appsWithMixedEventFormat}`,
    );

    // Sample validation (for backward compatibility)
    const sampleApp = allApps[0];
    if (sampleApp) {
      console.log("🔍 Sample application structure validation:");
      console.log(`   - Has events: ${Array.isArray(sampleApp.events)}`);
      console.log(`   - Events count: ${sampleApp.events?.length || 0}`);

      if (sampleApp.events?.length > 0) {
        const firstEvent = sampleApp.events[0];
        console.log(`   - Event has title: ${!!firstEvent.title}`);
        console.log(`   - Event has date: ${!!firstEvent.date}`);
        console.log(
          `   - Event has statusId (old format): ${!!firstEvent.statusId}`,
        );
        console.log(
          `   - Event has statusName (old format): ${!!firstEvent.statusName}`,
        );
        console.log(`   - Event has notes (old format): ${!!firstEvent.notes}`);
      }

      // Check status dates
      const statusDateFields = [
        "appliedDate",
        "phoneScreenDate",
        "round1Date",
        "round2Date",
        "acceptedDate",
        "declinedDate",
      ];
      const presentDates = statusDateFields.filter((field) => sampleApp[field]);
      console.log(
        `   - Status dates present: ${presentDates.join(", ") || "none"}`,
      );
    }

    // Report validation errors
    if (validationErrors.length > 0) {
      console.log("\n⚠️  Validation errors detected:");
      validationErrors.forEach((error) => console.log(`     - ${error}`));
    }

    // Critical validation failures
    if (appsWithOldEventFormat > 0) {
      console.log("\n❌ CRITICAL: Found applications with old event format!");
      console.log("   This means migration 001 did not complete successfully.");
      console.log(
        "   Events should have {id, title, description, date} format.",
      );
      console.log(
        "   Found events with {statusId, statusName, notes, date} format.",
      );
    }

    if (validationErrors.length === 0 && appsWithOldEventFormat === 0) {
      console.log("✅ Data validation completed - All checks passed");
    } else {
      console.log("⚠️  Data validation completed with issues");
    }
  }
}

// Helper function to create a backup
export async function createBackup(backupName: string): Promise<void> {
  console.log(`\n💾 Creating backup: ${backupName}`);
  console.log("⚠️  Please ensure you have a MongoDB backup strategy in place");
  console.log(
    "   For Railway MongoDB, use: railway run mongodump --uri $MONGO_URL",
  );
  console.log(`   Save backup as: ${backupName}_$(date +%Y%m%d_%H%M%S)`);
}

// Command line interface
const isMainModule =
  process.argv[1]?.endsWith("/migration-runner.ts") ||
  process.argv[1]?.endsWith("\\migration-runner.ts");

if (isMainModule) {
  const args = process.argv.slice(2);
  const command = args[0];
  const migrationId = args[1];

  async function main() {
    try {
      // Import migrations here to avoid circular dependencies
      const { getAllMigrations } = await import("./index.js");
      const runner = new MigrationRunner(getAllMigrations());

      switch (command) {
        case "run":
          await createBackup("pre_migration");
          await runner.runMigrations(false, false);
          await runner.validateData();
          break;

        case "force":
          await createBackup("pre_migration_force");
          await runner.runMigrations(false, true);
          await runner.validateData();
          break;

        case "dry-run":
          await runner.runMigrations(true, false);
          break;

        case "rollback":
          if (!migrationId) {
            console.error("Usage: npm run db:migrate rollback <migration-id>");
            await closeDatabaseConnection();
            process.exit(1);
          }
          await createBackup("pre_rollback");
          await runner.rollbackMigration(migrationId);
          break;

        case "validate":
          await runner.validateData();
          break;

        default:
          console.log("Usage:");
          console.log(
            "  npm run db:migrate run        - Run all pending migrations",
          );
          console.log(
            "  npm run db:migrate force      - Force re-run all migrations",
          );
          console.log(
            "  npm run db:migrate dry-run    - Test migrations without changes",
          );
          console.log(
            "  npm run db:migrate rollback <id> - Rollback specific migration",
          );
          console.log(
            "  npm run db:migrate validate   - Validate current data",
          );
          await closeDatabaseConnection();
          process.exit(0);
      }

      // Close database connection and exit
      await closeDatabaseConnection();
      console.log("\n📡 Database connection closed");
      process.exit(0);
    } catch (error: any) {
      console.error("💥 Migration failed:", error.message);
      await closeDatabaseConnection();
      process.exit(1);
    }
  }

  main();
}

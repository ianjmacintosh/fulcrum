import { Db } from "mongodb";
import { Migration, MigrationResult } from "./migration-runner";
import { defaultWorkflowService } from "../services/default-workflow";

/**
 * Migration 003: Update Application Statuses
 *
 * Updates the application statuses collection to use the new 7-status workflow:
 * Not Applied → Applied → Phone Screen → Round 1 → Round 2 → Accepted/Declined
 *
 * Creates default statuses for all users and updates existing status references.
 */
export const updateApplicationStatuses: Migration = {
  id: "003",
  name: "Update Application Statuses",
  description:
    "Migrate to new 7-status workflow and create default statuses for all users",

  async execute(db: Db, dryRun: boolean): Promise<MigrationResult> {
    const errors: string[] = [];
    let documentsModified = 0;

    try {
      const statusesCollection = db.collection("application_statuses");
      const applicationsCollection = db.collection("applications");

      // Get all unique user IDs from applications
      const userIds = await applicationsCollection.distinct("userId");
      console.log(`   Found ${userIds.length} unique users`);

      // Get default status definitions
      const defaultStatuses = defaultWorkflowService.getDefaultStatuses();

      for (const userId of userIds) {
        // Check if user already has the new statuses
        const existingStatuses = await statusesCollection
          .find({ userId })
          .toArray();
        const existingStatusNames = existingStatuses.map((s) => s.name);

        // Check if user has the new workflow statuses
        const hasNewWorkflow = defaultStatuses.every((ds) =>
          existingStatusNames.includes(ds.name),
        );

        if (!hasNewWorkflow) {
          // Create missing statuses
          const statusesToCreate = defaultStatuses.filter(
            (ds) => !existingStatusNames.includes(ds.name),
          );

          if (statusesToCreate.length > 0) {
            if (!dryRun) {
              const newStatuses = statusesToCreate.map((statusDef) => ({
                userId,
                name: statusDef.name,
                description: statusDef.description,
                isTerminal: statusDef.isTerminal,
                createdAt: new Date(),
              }));

              await statusesCollection.insertMany(newStatuses);
            }

            documentsModified += statusesToCreate.length;

            if (dryRun) {
              console.log(
                `   [DRY RUN] Would create ${statusesToCreate.length} statuses for user ${userId}`,
              );
            }
          }
        }
      }

      // Update application currentStatus to use valid status IDs
      const applications = await applicationsCollection.find({}).toArray();
      let updatedApplications = 0;

      for (const app of applications) {
        if (!app.currentStatus) continue;

        // Find the corresponding status in the database
        const statusDoc = await statusesCollection.findOne({
          userId: app.userId,
          name: app.currentStatus.name,
        });

        if (statusDoc && app.currentStatus.id !== statusDoc._id.toString()) {
          // Update the currentStatus.id to match the database
          if (!dryRun) {
            await applicationsCollection.updateOne(
              { _id: app._id },
              {
                $set: {
                  "currentStatus.id": statusDoc._id.toString(),
                },
              },
            );
          }
          updatedApplications++;

          if (dryRun) {
            console.log(
              `   [DRY RUN] Would update currentStatus.id for application ${app._id}`,
            );
          }
        }
      }

      documentsModified += updatedApplications;

      return {
        success: true,
        message: `Successfully updated application statuses workflow`,
        documentsModified,
        errors,
      };
    } catch (error: any) {
      errors.push(error.message);
      return {
        success: false,
        message: `Failed to update application statuses: ${error.message}`,
        documentsModified,
        errors,
      };
    }
  },

  async rollback(db: Db): Promise<MigrationResult> {
    try {
      const statusesCollection = db.collection("application_statuses");

      // This rollback removes the new workflow statuses
      // WARNING: This is destructive and should only be used in development

      const defaultStatuses = defaultWorkflowService.getDefaultStatuses();
      const statusNamesToRemove = defaultStatuses.map((s) => s.name);

      const result = await statusesCollection.deleteMany({
        name: { $in: statusNamesToRemove },
      });

      return {
        success: true,
        message: `Removed ${result.deletedCount} default workflow statuses`,
        documentsModified: result.deletedCount,
        errors: [
          "WARNING: This rollback removed workflow statuses. Applications may have invalid status references.",
        ],
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to rollback application statuses: ${error.message}`,
        documentsModified: 0,
        errors: [error.message],
      };
    }
  },
};

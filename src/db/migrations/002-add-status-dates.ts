import { Db } from "mongodb";
import { Migration, MigrationResult } from "./migration-runner";

/**
 * Migration 002: Add Status Dates
 *
 * Analyzes existing events and derives status dates for the new date-based tracking system.
 * Adds fields: appliedDate, phoneScreenDate, round1Date, round2Date, acceptedDate, declinedDate
 *
 * Maps event titles/types to appropriate status dates based on keywords.
 */
export const addStatusDates: Migration = {
  id: "002",
  name: "Add Status Dates",
  description:
    "Derive status dates from existing events and add date-based status tracking fields",

  async execute(db: Db, dryRun: boolean): Promise<MigrationResult> {
    const errors: string[] = [];
    let documentsModified = 0;

    try {
      const collection = db.collection("applications");

      // Find all applications
      const applications = await collection.find({}).toArray();

      console.log(`   Found ${applications.length} applications to process`);

      for (const app of applications) {
        const statusDates: any = {};

        // Process events to derive status dates
        if (app.events && Array.isArray(app.events)) {
          for (const event of app.events) {
            const eventTitle = (
              event.title ||
              event.eventType ||
              ""
            ).toLowerCase();
            const eventDate = event.date;

            if (!eventDate) continue;

            // Map event titles to status dates
            if (
              eventTitle.includes("applied") ||
              eventTitle.includes("application")
            ) {
              if (
                !statusDates.appliedDate ||
                eventDate < statusDates.appliedDate
              ) {
                statusDates.appliedDate = eventDate;
              }
            }

            if (
              eventTitle.includes("phone screen") ||
              eventTitle.includes("phone call") ||
              eventTitle.includes("screening")
            ) {
              if (
                !statusDates.phoneScreenDate ||
                eventDate > statusDates.phoneScreenDate
              ) {
                statusDates.phoneScreenDate = eventDate;
              }
            }

            if (
              eventTitle.includes("interview") ||
              eventTitle.includes("round 1") ||
              eventTitle.includes("first round") ||
              eventTitle.includes("technical")
            ) {
              if (
                !statusDates.round1Date ||
                eventDate > statusDates.round1Date
              ) {
                statusDates.round1Date = eventDate;
              }
            }

            if (
              eventTitle.includes("round 2") ||
              eventTitle.includes("second round") ||
              eventTitle.includes("final round") ||
              eventTitle.includes("onsite")
            ) {
              if (
                !statusDates.round2Date ||
                eventDate > statusDates.round2Date
              ) {
                statusDates.round2Date = eventDate;
              }
            }

            if (
              eventTitle.includes("accepted") ||
              eventTitle.includes("offer") ||
              eventTitle.includes("hired")
            ) {
              if (
                !statusDates.acceptedDate ||
                eventDate > statusDates.acceptedDate
              ) {
                statusDates.acceptedDate = eventDate;
              }
            }

            if (
              eventTitle.includes("rejected") ||
              eventTitle.includes("declined") ||
              eventTitle.includes("rejection") ||
              eventTitle.includes("not selected") ||
              eventTitle.includes("passed")
            ) {
              if (
                !statusDates.declinedDate ||
                eventDate > statusDates.declinedDate
              ) {
                statusDates.declinedDate = eventDate;
              }
            }
          }
        }

        // Special handling: if no appliedDate found but we have other events,
        // use the earliest event date as applied date
        if (!statusDates.appliedDate && app.events && app.events.length > 0) {
          const earliestEvent = app.events.reduce(
            (earliest: any, event: any) => {
              if (!event.date) return earliest;
              if (!earliest || event.date < earliest.date) return event;
              return earliest;
            },
            null,
          );

          if (earliestEvent) {
            statusDates.appliedDate = earliestEvent.date;
          }
        }

        // Only update if we have status dates to add and they don't already exist
        const hasNewDates = Object.keys(statusDates).some(
          (key) => statusDates[key] && !app[key],
        );

        if (hasNewDates) {
          // Only set dates that don't already exist
          const updateDoc: any = {};
          Object.keys(statusDates).forEach((key) => {
            if (statusDates[key] && !app[key]) {
              updateDoc[key] = statusDates[key];
            }
          });

          if (Object.keys(updateDoc).length > 0) {
            if (!dryRun) {
              await collection.updateOne({ _id: app._id }, { $set: updateDoc });
            }
            documentsModified++;

            if (dryRun) {
              console.log(
                `   [DRY RUN] Would add status dates for application ${app._id}:`,
                Object.keys(updateDoc),
              );
            }
          }
        }
      }

      return {
        success: true,
        message: `Successfully added status dates`,
        documentsModified,
        errors,
      };
    } catch (error: any) {
      errors.push(error.message);
      return {
        success: false,
        message: `Failed to add status dates: ${error.message}`,
        documentsModified,
        errors,
      };
    }
  },

  async rollback(db: Db): Promise<MigrationResult> {
    try {
      const collection = db.collection("applications");

      // Remove all status date fields
      const result = await collection.updateMany(
        {},
        {
          $unset: {
            appliedDate: 1,
            phoneScreenDate: 1,
            round1Date: 1,
            round2Date: 1,
            acceptedDate: 1,
            declinedDate: 1,
          },
        },
      );

      return {
        success: true,
        message: `Removed status dates from ${result.modifiedCount} applications`,
        documentsModified: result.modifiedCount,
        errors: [],
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to rollback status dates: ${error.message}`,
        documentsModified: 0,
        errors: [error.message],
      };
    }
  },
};

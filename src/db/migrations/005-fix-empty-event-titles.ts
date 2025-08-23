import { Db } from "mongodb";
import { Migration, MigrationResult } from "./migration-runner";

/**
 * Migration 005: Fix Empty Event Titles
 *
 * Finds all application events with empty or whitespace-only titles
 * and sets them to 'Event' to maintain schema compliance.
 */
export const fixEmptyEventTitles: Migration = {
  id: "005",
  name: "Fix Empty Event Titles",
  description: 'Replace empty or whitespace-only event titles with "Event"',

  async execute(db: Db, dryRun: boolean): Promise<MigrationResult> {
    const errors: string[] = [];
    let documentsModified = 0;
    let eventsFixed = 0;

    try {
      const collection = db.collection("applications");

      // Find all applications with events
      const applications = await collection
        .find({
          events: { $exists: true, $ne: [] },
        })
        .toArray();

      console.log(`   Found ${applications.length} applications with events`);

      for (const app of applications) {
        if (!app.events || !Array.isArray(app.events)) {
          continue;
        }

        let hasEmptyTitles = false;
        const fixedEvents = app.events.map((event: any) => {
          // Check if title is empty, undefined, or whitespace-only
          if (
            !event.title ||
            (typeof event.title === "string" && event.title.trim().length === 0)
          ) {
            hasEmptyTitles = true;
            eventsFixed++;

            return {
              ...event,
              title: "Event",
            };
          }

          return event;
        });

        // Only update if we found events with empty titles
        if (hasEmptyTitles) {
          if (!dryRun) {
            await collection.updateOne(
              { _id: app._id },
              { $set: { events: fixedEvents } },
            );
          }
          documentsModified++;

          if (dryRun) {
            const emptyCount = app.events.filter(
              (e: any) =>
                !e.title ||
                (typeof e.title === "string" && e.title.trim().length === 0),
            ).length;
            console.log(
              `   [DRY RUN] Would fix ${emptyCount} empty titles for application ${app._id}`,
            );
          }
        }
      }

      return {
        success: true,
        message: `Fixed ${eventsFixed} empty event titles across ${documentsModified} applications`,
        documentsModified,
        errors,
      };
    } catch (error: any) {
      errors.push(error.message);
      return {
        success: false,
        message: `Failed to fix empty event titles: ${error.message}`,
        documentsModified,
        errors,
      };
    }
  },

  async rollback(db: Db): Promise<MigrationResult> {
    // This rollback cannot restore the original empty titles since we don't know
    // which events originally had empty titles vs which had "Event" as their title
    return {
      success: false,
      message:
        'Cannot rollback this migration - original empty titles cannot be distinguished from intentional "Event" titles',
      documentsModified: 0,
      errors: ["Rollback not supported for this migration"],
    };
  },
};

import { Db } from "mongodb";
import { Migration, MigrationResult } from "./migration-runner";

/**
 * Migration 006: Add 'Application created' Events and Status Events to Legacy Applications
 *
 * For each existing application:
 * 1. Adds "Application created" event (if not already present)
 * 2. Creates events for each populated status date field in workflow order
 * 3. All events use migration date as event date (not the scheduled dates)
 * 4. Event descriptions include the actual scheduled dates
 */
export const addApplicationCreatedEvents: Migration = {
  id: "006",
  name: "Add 'Application created' Events and Status Events to Legacy Applications",
  description:
    "Add missing lifecycle events to existing applications based on their current status dates",

  async execute(db: Db, dryRun: boolean): Promise<MigrationResult> {
    const errors: string[] = [];
    let documentsModified = 0;
    let eventsAdded = 0;

    try {
      const collection = db.collection("applications");
      const migrationDate = new Date().toISOString().split("T")[0];

      // Get all applications
      const applications = await collection.find({}).toArray();

      console.log(`   Processing ${applications.length} applications...`);

      // Status date fields in workflow order
      const statusDateFields = [
        {
          field: "appliedDate",
          title: "Application submitted",
          description: "Applied to position",
        },
        {
          field: "phoneScreenDate",
          title: "Phone screen scheduled",
          description: "Phone screening interview scheduled",
        },
        {
          field: "round1Date",
          title: "First interview scheduled",
          description: "First round interview scheduled",
        },
        {
          field: "round2Date",
          title: "Second interview scheduled",
          description: "Second round interview scheduled",
        },
        {
          field: "acceptedDate",
          title: "Offer accepted",
          description: "Job offer accepted",
        },
        {
          field: "declinedDate",
          title: "Application declined",
          description: "Application was declined or withdrawn",
        },
      ];

      for (const app of applications) {
        const newEvents: any[] = [];

        // Helper to generate event IDs
        const generateEventId = () =>
          `event_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

        // 1. Always add "Application created" event if not present
        const hasApplicationCreatedEvent = app.events?.some(
          (event: any) => event.title === "Application created",
        );

        if (!hasApplicationCreatedEvent) {
          newEvents.push({
            id: generateEventId(),
            title: "Application created",
            description: "Application tracking started",
            date: migrationDate,
          });
          eventsAdded++;
        }

        // 2. Add events for each populated status date field in order
        for (const { field, title } of statusDateFields) {
          const statusDate = app[field];

          if (statusDate) {
            // Check if we already have an event for this status
            const hasStatusEvent = app.events?.some(
              (event: any) =>
                event.title === title ||
                (event.title === "Application submitted" &&
                  field === "appliedDate") ||
                (event.title === "Phone screen scheduled" &&
                  field === "phoneScreenDate") ||
                (event.title === "First interview scheduled" &&
                  field === "round1Date") ||
                (event.title === "Second interview scheduled" &&
                  field === "round2Date") ||
                (event.title === "Offer accepted" &&
                  field === "acceptedDate") ||
                (event.title === "Application declined" &&
                  field === "declinedDate"),
            );

            if (!hasStatusEvent) {
              let eventDescription;
              if (field === "appliedDate") {
                eventDescription = `Applied to position on ${statusDate}`;
              } else if (field === "phoneScreenDate") {
                eventDescription = `Phone screening interview scheduled for ${statusDate}`;
              } else if (field === "round1Date") {
                eventDescription = `First round interview scheduled for ${statusDate}`;
              } else if (field === "round2Date") {
                eventDescription = `Second round interview scheduled for ${statusDate}`;
              } else if (field === "acceptedDate") {
                eventDescription = `Job offer accepted on ${statusDate}`;
              } else if (field === "declinedDate") {
                eventDescription = `Application declined on ${statusDate}`;
              }

              newEvents.push({
                id: generateEventId(),
                title,
                description: eventDescription,
                date: migrationDate, // Migration date, not scheduled date
              });
              eventsAdded++;
            }
          }
        }

        // Update application if we have new events to add
        if (newEvents.length > 0) {
          const existingEvents = app.events || [];
          const allEvents = [...newEvents, ...existingEvents];

          if (!dryRun) {
            await collection.updateOne(
              { _id: app._id },
              { $set: { events: allEvents } },
            );
          }

          documentsModified++;

          if (dryRun) {
            console.log(
              `   [DRY RUN] Would add ${newEvents.length} events to application ${app._id} (${app.companyName} - ${app.roleName})`,
            );
            newEvents.forEach((event, idx) => {
              console.log(
                `     ${idx + 1}. ${event.title}: ${event.description}`,
              );
            });
          }
        }
      }

      return {
        success: true,
        message: `Added ${eventsAdded} lifecycle events to ${documentsModified} applications`,
        documentsModified,
        errors,
      };
    } catch (error: any) {
      errors.push(error.message);
      return {
        success: false,
        message: `Failed to add application lifecycle events: ${error.message}`,
        documentsModified,
        errors,
      };
    }
  },

  async rollback(db: Db): Promise<MigrationResult> {
    const errors: string[] = [];
    let documentsModified = 0;

    try {
      const collection = db.collection("applications");

      // Find applications that have lifecycle events that match our migration pattern
      const applications = await collection
        .find({
          events: {
            $elemMatch: {
              $or: [
                {
                  title: "Application created",
                  description: "Application tracking started",
                },
                {
                  title: "Application submitted",
                  description: { $regex: "Applied to position on" },
                },
                {
                  title: "Phone screen scheduled",
                  description: {
                    $regex: "Phone screening interview scheduled for",
                  },
                },
                {
                  title: "First interview scheduled",
                  description: {
                    $regex: "First round interview scheduled for",
                  },
                },
                {
                  title: "Second interview scheduled",
                  description: {
                    $regex: "Second round interview scheduled for",
                  },
                },
                {
                  title: "Offer accepted",
                  description: { $regex: "Job offer accepted on" },
                },
                {
                  title: "Application declined",
                  description: { $regex: "Application declined on" },
                },
              ],
            },
          },
        })
        .toArray();

      console.log(
        `   Found ${applications.length} applications with migration-created events to remove`,
      );

      for (const app of applications) {
        if (!app.events || !Array.isArray(app.events)) {
          continue;
        }

        // Remove events that match our migration pattern
        const filteredEvents = app.events.filter((event: any) => {
          // Keep events that don't match our migration patterns
          return !(
            (event.title === "Application created" &&
              event.description === "Application tracking started") ||
            (event.title === "Application submitted" &&
              event.description?.includes("Applied to position on")) ||
            (event.title === "Phone screen scheduled" &&
              event.description?.includes(
                "Phone screening interview scheduled for",
              )) ||
            (event.title === "First interview scheduled" &&
              event.description?.includes(
                "First round interview scheduled for",
              )) ||
            (event.title === "Second interview scheduled" &&
              event.description?.includes(
                "Second round interview scheduled for",
              )) ||
            (event.title === "Offer accepted" &&
              event.description?.includes("Job offer accepted on")) ||
            (event.title === "Application declined" &&
              event.description?.includes("Application declined on"))
          );
        });

        await collection.updateOne(
          { _id: app._id },
          { $set: { events: filteredEvents } },
        );

        documentsModified++;
      }

      return {
        success: true,
        message: `Removed migration-created events from ${documentsModified} applications`,
        documentsModified,
        errors,
      };
    } catch (error: any) {
      errors.push(error.message);
      return {
        success: false,
        message: `Failed to rollback application lifecycle events: ${error.message}`,
        documentsModified,
        errors,
      };
    }
  },
};

import { Migration } from "./migration-runner";
import { migrateEventsSchema } from "./001-migrate-events-schema";
import { addStatusDates } from "./002-add-status-dates";
import { updateApplicationStatuses } from "./003-update-application-statuses";
import { recalculateCurrentStatuses } from "./004-recalculate-current-statuses";
import { fixEmptyEventTitles } from "./005-fix-empty-event-titles";

/**
 * All available migrations in execution order
 */
export function getAllMigrations(): Migration[] {
  return [
      migrateEventsSchema,
    addStatusDates,
    updateApplicationStatuses,
    recalculateCurrentStatuses,
    fixEmptyEventTitles,
  ];
}

/**
 * Get a specific migration by ID
 */
export function getMigration(id: string): Migration | undefined {
  return getAllMigrations().find((m) => m.id === id);
}

/**
 * Get migrations that haven't been run yet
 */
export async function getPendingMigrations(): Promise<Migration[]> {
  const { MigrationRunner } = await import("./migration-runner");
  const runner = new MigrationRunner(getAllMigrations());
  await runner.connect();

  const pending: Migration[] = [];

  for (const migration of getAllMigrations()) {
    const hasRun = await runner.hasRun(migration.id);
    if (!hasRun) {
      pending.push(migration);
    }
  }

  return pending;
}

import { SQLocal } from 'sqlocal';
import { applyMigrations } from './migrations';
import type { DatabaseClient } from './types';

const sqlocalClient = new SQLocal('expense_tracker.db');

export const databaseClient: DatabaseClient = {
  sql: <Result,>(...args: Parameters<DatabaseClient['sql']>) =>
    sqlocalClient.sql(...args) as Promise<Result[]>,
};

let initializationPromise: Promise<void> | null = null;

export function ensureDatabaseReady(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = applyMigrations(databaseClient);
  }

  return initializationPromise;
}

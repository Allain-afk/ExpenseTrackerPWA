import { SQLocal } from 'sqlocal';
import { applyMigrations } from './migrations';
import type { DatabaseClient } from './types';

const sqlocalClient = new SQLocal('expense_tracker.db');
const DATABASE_INIT_TIMEOUT_MS = 15000;

export const databaseClient: DatabaseClient = {
  sql: <Result,>(...args: Parameters<DatabaseClient['sql']>) =>
    sqlocalClient.sql(...args) as Promise<Result[]>,
};

let initializationPromise: Promise<void> | null = null;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: number | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle !== null) {
      window.clearTimeout(timeoutHandle);
    }
  }
}

export function ensureDatabaseReady(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = withTimeout(
      applyMigrations(databaseClient),
      DATABASE_INIT_TIMEOUT_MS,
      'Database initialization',
    ).catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

import { describe, expect, it } from 'vitest';
import { applyMigrations, databaseVersion } from './migrations';
import type { DatabaseClient } from './types';

function normalize(query: string) {
  return query.replace(/\s+/g, ' ').trim();
}

class MigrationClient implements DatabaseClient {
  calls: string[] = [];
  version = 0;

  async sql<Result = Record<string, unknown>>(queryTemplate: TemplateStringsArray | string): Promise<Result[]> {
    const query = normalize(String(queryTemplate));
    this.calls.push(query);

    if (query === 'PRAGMA user_version') {
      return [{ user_version: this.version }] as Result[];
    }

    if (query.startsWith('PRAGMA user_version = ')) {
      this.version = Number(query.split('=').at(-1)?.trim() ?? 0);
      return [] as Result[];
    }

    if (query.startsWith('PRAGMA table_info(')) {
      return [] as Result[];
    }

    return [] as Result[];
  }
}

describe('database migrations', () => {
  it('applies all migrations up to the latest schema version', async () => {
    const client = new MigrationClient();

    await applyMigrations(client);

    expect(client.version).toBe(databaseVersion);
    expect(client.calls.some((query) => query.includes('CREATE TABLE IF NOT EXISTS expense_groups'))).toBe(true);
    expect(client.calls.some((query) => query.includes('ALTER TABLE transactions ADD COLUMN groupId INTEGER'))).toBe(true);
    expect(client.calls.some((query) => query.includes('CREATE TABLE IF NOT EXISTS wallets'))).toBe(true);
    expect(client.calls.some((query) => query.includes('CREATE INDEX IF NOT EXISTS idx_transactions_date'))).toBe(true);
    expect(client.calls.some((query) => query.includes('ALTER TABLE wallets ADD COLUMN isHidden INTEGER NOT NULL DEFAULT 0'))).toBe(true);
    expect(client.calls.some((query) => query.includes('ALTER TABLE wallets ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0'))).toBe(true);
    expect(client.calls.some((query) => query.includes('SELECT id FROM wallets ORDER BY id ASC'))).toBe(true);
  });
});

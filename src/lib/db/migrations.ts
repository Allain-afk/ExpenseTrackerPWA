import type { DatabaseClient } from './types';

export const databaseVersion = 6;

async function getUserVersion(client: DatabaseClient): Promise<number> {
  const [result] = await client.sql<{ user_version: number }>('PRAGMA user_version');
  return Number(result?.user_version ?? 0);
}

async function setUserVersion(client: DatabaseClient, version: number): Promise<void> {
  await client.sql(`PRAGMA user_version = ${version}`);
}

async function columnExists(
  client: DatabaseClient,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const columns = await client.sql<{ name: string }>(`PRAGMA table_info(${tableName})`);
  return columns.some((column) => column.name === columnName);
}

async function migrateToV1(client: DatabaseClient): Promise<void> {
  await client.sql(`
    CREATE TABLE IF NOT EXISTS expense_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  await client.sql(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      imagePath TEXT
    )
  `);
}

async function migrateToV2(client: DatabaseClient): Promise<void> {
  await client.sql(`
    CREATE TABLE IF NOT EXISTS expense_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  if (!(await columnExists(client, 'transactions', 'groupId'))) {
    await client.sql('ALTER TABLE transactions ADD COLUMN groupId INTEGER');
  }
}

async function migrateToV3(client: DatabaseClient): Promise<void> {
  await client.sql(`
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      colorValue INTEGER NOT NULL
    )
  `);

  if (!(await columnExists(client, 'transactions', 'walletId'))) {
    await client.sql('ALTER TABLE transactions ADD COLUMN walletId INTEGER');
  }
}

async function migrateToV4(client: DatabaseClient): Promise<void> {
  await client.sql('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)');
  await client.sql('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)');
  await client.sql('CREATE INDEX IF NOT EXISTS idx_transactions_group ON transactions(groupId)');
}

async function migrateToV5(client: DatabaseClient): Promise<void> {
  if (!(await columnExists(client, 'wallets', 'isHidden'))) {
    await client.sql('ALTER TABLE wallets ADD COLUMN isHidden INTEGER NOT NULL DEFAULT 0');
  }
}

async function migrateToV6(client: DatabaseClient): Promise<void> {
  if (!(await columnExists(client, 'wallets', 'sortOrder'))) {
    await client.sql('ALTER TABLE wallets ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0');
  }

  const walletIds = await client.sql<{ id: number }>('SELECT id FROM wallets ORDER BY id ASC');

  for (const [index, wallet] of walletIds.entries()) {
    await client.sql('UPDATE wallets SET sortOrder = ? WHERE id = ?', index, Number(wallet.id));
  }
}

const migrations = [migrateToV1, migrateToV2, migrateToV3, migrateToV4, migrateToV5, migrateToV6];

export async function applyMigrations(client: DatabaseClient): Promise<void> {
  let currentVersion = await getUserVersion(client);

  while (currentVersion < databaseVersion) {
    const nextVersion = currentVersion + 1;
    const migration = migrations[nextVersion - 1];

    if (!migration) {
      throw new Error(`Missing migration for database version ${nextVersion}`);
    }

    await migration(client);
    await setUserVersion(client, nextVersion);
    currentVersion = nextVersion;
  }
}

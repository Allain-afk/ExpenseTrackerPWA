import type { DatabaseClient } from './types';

export const databaseVersion = 8;

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

function nowIsoTimestamp(): string {
  return new Date().toISOString();
}

async function migrateToV7(client: DatabaseClient): Promise<void> {
  const syncTables = ['transactions', 'wallets', 'expense_groups'] as const;

  for (const tableName of syncTables) {
    if (!(await columnExists(client, tableName, 'uuid'))) {
      await client.sql(`ALTER TABLE ${tableName} ADD COLUMN uuid TEXT`);
    }

    if (!(await columnExists(client, tableName, 'user_id'))) {
      await client.sql(`ALTER TABLE ${tableName} ADD COLUMN user_id TEXT`);
    }

    if (!(await columnExists(client, tableName, 'is_synced'))) {
      await client.sql(`ALTER TABLE ${tableName} ADD COLUMN is_synced INTEGER NOT NULL DEFAULT 0`);
    }

    if (!(await columnExists(client, tableName, 'last_modified'))) {
      await client.sql(`ALTER TABLE ${tableName} ADD COLUMN last_modified TEXT`);
    }
  }

  await client.sql('UPDATE transactions SET is_synced = 0 WHERE is_synced IS NULL');
  await client.sql('UPDATE wallets SET is_synced = 0 WHERE is_synced IS NULL');
  await client.sql('UPDATE expense_groups SET is_synced = 0 WHERE is_synced IS NULL');

  const transactionRows = await client.sql<{ id: number; uuid: string | null; last_modified: string | null }>(
    'SELECT id, uuid, last_modified FROM transactions',
  );

  for (const row of transactionRows) {
    const nextUuid = row.uuid && row.uuid.trim() ? row.uuid : crypto.randomUUID();
    const nextLastModified = row.last_modified && row.last_modified.trim()
      ? row.last_modified
      : nowIsoTimestamp();

    await client.sql(
      'UPDATE transactions SET uuid = ?, last_modified = ? WHERE id = ?',
      nextUuid,
      nextLastModified,
      Number(row.id),
    );
  }

  const walletRows = await client.sql<{ id: number; uuid: string | null; last_modified: string | null }>(
    'SELECT id, uuid, last_modified FROM wallets',
  );

  for (const row of walletRows) {
    const nextUuid = row.uuid && row.uuid.trim() ? row.uuid : crypto.randomUUID();
    const nextLastModified = row.last_modified && row.last_modified.trim()
      ? row.last_modified
      : nowIsoTimestamp();

    await client.sql(
      'UPDATE wallets SET uuid = ?, last_modified = ? WHERE id = ?',
      nextUuid,
      nextLastModified,
      Number(row.id),
    );
  }

  const groupRows = await client.sql<{ id: number; uuid: string | null; last_modified: string | null }>(
    'SELECT id, uuid, last_modified FROM expense_groups',
  );

  for (const row of groupRows) {
    const nextUuid = row.uuid && row.uuid.trim() ? row.uuid : crypto.randomUUID();
    const nextLastModified = row.last_modified && row.last_modified.trim()
      ? row.last_modified
      : nowIsoTimestamp();

    await client.sql(
      'UPDATE expense_groups SET uuid = ?, last_modified = ? WHERE id = ?',
      nextUuid,
      nextLastModified,
      Number(row.id),
    );
  }

  await client.sql('CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_uuid ON transactions(uuid)');
  await client.sql('CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_uuid ON wallets(uuid)');
  await client.sql('CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_groups_uuid ON expense_groups(uuid)');

  await client.sql(
    'CREATE INDEX IF NOT EXISTS idx_transactions_user_synced ON transactions(user_id, is_synced)',
  );
  await client.sql('CREATE INDEX IF NOT EXISTS idx_wallets_user_synced ON wallets(user_id, is_synced)');
  await client.sql(
    'CREATE INDEX IF NOT EXISTS idx_expense_groups_user_synced ON expense_groups(user_id, is_synced)',
  );
}

async function migrateToV8(client: DatabaseClient): Promise<void> {
  await client.sql(`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      limit_amount REAL NOT NULL,
      uuid TEXT UNIQUE,
      user_id TEXT,
      is_synced INTEGER NOT NULL DEFAULT 0,
      last_modified TEXT
    )
  `);

  await client.sql('UPDATE budgets SET is_synced = 0 WHERE is_synced IS NULL');

  const budgetRows = await client.sql<{ id: string | null; uuid: string | null; last_modified: string | null }>(
    'SELECT id, uuid, last_modified FROM budgets',
  );

  for (const row of budgetRows) {
    const rowId = row.id && row.id.trim() ? row.id : crypto.randomUUID();
    const rowUuid = row.uuid && row.uuid.trim() ? row.uuid : rowId;
    const rowLastModified = row.last_modified && row.last_modified.trim()
      ? row.last_modified
      : nowIsoTimestamp();

    await client.sql(
      'UPDATE budgets SET id = ?, uuid = ?, last_modified = ? WHERE COALESCE(id, "") = COALESCE(?, "")',
      rowId,
      rowUuid,
      rowLastModified,
      row.id,
    );
  }

  await client.sql('CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_uuid ON budgets(uuid)');
  await client.sql('CREATE INDEX IF NOT EXISTS idx_budgets_user_synced ON budgets(user_id, is_synced)');
  await client.sql('CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category)');
}

const migrations = [
  migrateToV1,
  migrateToV2,
  migrateToV3,
  migrateToV4,
  migrateToV5,
  migrateToV6,
  migrateToV7,
  migrateToV8,
];

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

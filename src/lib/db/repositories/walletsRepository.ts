import { ensureDatabaseReady } from '../client';
import type { DatabaseClient } from '../types';
import type { Wallet } from '../../../types/models';
import { fromIsoTimestamp, toIsoTimestamp } from '../../utils/date';

interface WalletRow {
  id: number;
  name: string;
  type: string;
  colorValue: number;
  isHidden: number;
  sortOrder: number;
  low_balance_threshold: number | null;
  uuid: string | null;
  user_id: string | null;
  is_synced: number;
  last_modified: string | null;
}

function mapWallet(row: WalletRow): Wallet {
  return {
    id: Number(row.id),
    name: row.name,
    type: row.type,
    colorValue: Number(row.colorValue),
    isHidden: Boolean(Number(row.isHidden ?? 0)),
    sortOrder: Number(row.sortOrder ?? 0),
    lowBalanceThreshold: row.low_balance_threshold ?? null,
    uuid: row.uuid ?? undefined,
    userId: row.user_id,
    isSynced: Boolean(Number(row.is_synced ?? 0)),
    lastModified: fromIsoTimestamp(row.last_modified),
  };
}

export function createWalletsRepository(client: DatabaseClient) {
  return {
    async insertWallet(wallet: Wallet): Promise<number> {
      await ensureDatabaseReady();
      const walletUuid = wallet.uuid ?? crypto.randomUUID();
      const lastModified = toIsoTimestamp();
      const [sortOrderRow] = await client.sql<{ nextSortOrder: number }>(
        'SELECT COALESCE(MAX(sortOrder), -1) + 1 AS nextSortOrder FROM wallets',
      );

      await client.sql(
        `INSERT INTO wallets (
          name,
          type,
          colorValue,
          isHidden,
          sortOrder,
          low_balance_threshold,
          uuid,
          user_id,
          is_synced,
          last_modified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        wallet.name,
        wallet.type,
        wallet.colorValue,
        wallet.isHidden ? 1 : 0,
        Number(sortOrderRow?.nextSortOrder ?? 0),
        wallet.lowBalanceThreshold ?? null,
        walletUuid,
        wallet.userId ?? null,
        0,
        lastModified,
      );
      const [row] = await client.sql<{ id: number }>('SELECT last_insert_rowid() AS id');
      return Number(row.id);
    },

    async getAllWallets(): Promise<Wallet[]> {
      await ensureDatabaseReady();
      const rows = await client.sql<WalletRow>(
        'SELECT * FROM wallets ORDER BY sortOrder ASC, id ASC',
      );
      return rows.map(mapWallet);
    },

    async getWalletById(id: number): Promise<Wallet | null> {
      await ensureDatabaseReady();
      const [row] = await client.sql<WalletRow>('SELECT * FROM wallets WHERE id = ?', id);
      return row ? mapWallet(row) : null;
    },

    async updateWallet(wallet: Wallet): Promise<void> {
      await ensureDatabaseReady();
      const lastModified = toIsoTimestamp();
      const walletUuid = wallet.uuid ?? crypto.randomUUID();

      await client.sql(
        `UPDATE wallets
         SET name = ?,
             type = ?,
             colorValue = ?,
             isHidden = ?,
             low_balance_threshold = ?,
             uuid = COALESCE(uuid, ?),
             is_synced = 0,
             last_modified = ?
         WHERE id = ?`,
        wallet.name,
        wallet.type,
        wallet.colorValue,
        wallet.isHidden ? 1 : 0,
        wallet.lowBalanceThreshold ?? null,
        walletUuid,
        lastModified,
        wallet.id ?? null,
      );
    },

    async saveWalletOrder(walletIds: number[]): Promise<void> {
      await ensureDatabaseReady();

      for (const [index, walletId] of walletIds.entries()) {
        await client.sql(
          `UPDATE wallets
           SET sortOrder = ?,
               is_synced = 0,
               last_modified = ?
           WHERE id = ?`,
          index,
          toIsoTimestamp(),
          walletId,
        );
      }
    },

    async deleteWallet(id: number): Promise<void> {
      await ensureDatabaseReady();
      const timestamp = toIsoTimestamp();

      const [walletRow] = await client.sql<{ uuid: string | null }>('SELECT uuid FROM wallets WHERE id = ?', id);
      if (walletRow?.uuid) {
        await client.sql(
          'INSERT OR IGNORE INTO deleted_entities (uuid, table_name, deleted_at) VALUES (?, ?, ?)',
          walletRow.uuid,
          'wallets',
          timestamp,
        );
      }

      const txRows = await client.sql<{ uuid: string | null }>('SELECT uuid FROM transactions WHERE walletId = ?', id);
      for (const row of txRows) {
        if (row.uuid) {
          await client.sql(
            'INSERT OR IGNORE INTO deleted_entities (uuid, table_name, deleted_at) VALUES (?, ?, ?)',
            row.uuid,
            'transactions',
            timestamp,
          );
        }
      }

      await client.sql('DELETE FROM transactions WHERE walletId = ?', id);
      await client.sql('DELETE FROM wallets WHERE id = ?', id);
    },

    async clearWallets(): Promise<void> {
      await ensureDatabaseReady();
      await client.sql('DELETE FROM wallets');
    },
  };
}

import { ensureDatabaseReady } from '../client';
import type { DatabaseClient } from '../types';
import type { Wallet } from '../../../types/models';

interface WalletRow {
  id: number;
  name: string;
  type: string;
  colorValue: number;
  isHidden: number;
  sortOrder: number;
}

function mapWallet(row: WalletRow): Wallet {
  return {
    id: Number(row.id),
    name: row.name,
    type: row.type,
    colorValue: Number(row.colorValue),
    isHidden: Boolean(Number(row.isHidden ?? 0)),
    sortOrder: Number(row.sortOrder ?? 0),
  };
}

export function createWalletsRepository(client: DatabaseClient) {
  return {
    async insertWallet(wallet: Wallet): Promise<number> {
      await ensureDatabaseReady();
      const [sortOrderRow] = await client.sql<{ nextSortOrder: number }>(
        'SELECT COALESCE(MAX(sortOrder), -1) + 1 AS nextSortOrder FROM wallets',
      );

      await client.sql(
        'INSERT INTO wallets (name, type, colorValue, isHidden, sortOrder) VALUES (?, ?, ?, ?, ?)',
        wallet.name,
        wallet.type,
        wallet.colorValue,
        wallet.isHidden ? 1 : 0,
        Number(sortOrderRow?.nextSortOrder ?? 0),
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
      await client.sql(
        'UPDATE wallets SET name = ?, type = ?, colorValue = ?, isHidden = ? WHERE id = ?',
        wallet.name,
        wallet.type,
        wallet.colorValue,
        wallet.isHidden ? 1 : 0,
        wallet.id ?? null,
      );
    },

    async saveWalletOrder(walletIds: number[]): Promise<void> {
      await ensureDatabaseReady();

      for (const [index, walletId] of walletIds.entries()) {
        await client.sql('UPDATE wallets SET sortOrder = ? WHERE id = ?', index, walletId);
      }
    },

    async deleteWallet(id: number): Promise<void> {
      await ensureDatabaseReady();
      await client.sql('UPDATE transactions SET walletId = NULL WHERE walletId = ?', id);
      await client.sql('DELETE FROM wallets WHERE id = ?', id);
    },
  };
}

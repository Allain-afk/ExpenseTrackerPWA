import { ensureDatabaseReady } from '../client';
import type { DatabaseClient } from '../types';
import type { Wallet } from '../../../types/models';

interface WalletRow {
  id: number;
  name: string;
  type: string;
  colorValue: number;
}

function mapWallet(row: WalletRow): Wallet {
  return {
    id: Number(row.id),
    name: row.name,
    type: row.type,
    colorValue: Number(row.colorValue),
  };
}

export function createWalletsRepository(client: DatabaseClient) {
  return {
    async insertWallet(wallet: Wallet): Promise<number> {
      await ensureDatabaseReady();
      await client.sql(
        'INSERT INTO wallets (name, type, colorValue) VALUES (?, ?, ?)',
        wallet.name,
        wallet.type,
        wallet.colorValue,
      );
      const [row] = await client.sql<{ id: number }>('SELECT last_insert_rowid() AS id');
      return Number(row.id);
    },

    async getAllWallets(): Promise<Wallet[]> {
      await ensureDatabaseReady();
      const rows = await client.sql<WalletRow>('SELECT * FROM wallets');
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
        'UPDATE wallets SET name = ?, type = ?, colorValue = ? WHERE id = ?',
        wallet.name,
        wallet.type,
        wallet.colorValue,
        wallet.id ?? null,
      );
    },

    async deleteWallet(id: number): Promise<void> {
      await ensureDatabaseReady();
      await client.sql('UPDATE transactions SET walletId = NULL WHERE walletId = ?', id);
      await client.sql('DELETE FROM wallets WHERE id = ?', id);
    },
  };
}

import { describe, expect, it } from 'vitest';
import { createExpenseGroupsRepository } from './expenseGroupsRepository';
import { createTransactionsRepository } from './transactionsRepository';
import { createWalletsRepository } from './walletsRepository';
import type { DatabaseClient } from '../types';

function normalize(query: string) {
  return query.replace(/\s+/g, ' ').trim();
}

class FakeClient implements DatabaseClient {
  calls: Array<{ query: string; params: unknown[] }> = [];
  responses = new Map<string, unknown[]>();

  async sql<Result = Record<string, unknown>>(
    queryTemplate: TemplateStringsArray | string,
    ...params: unknown[]
  ): Promise<Result[]> {
    const query = normalize(String(queryTemplate));
    this.calls.push({ query, params });
    return (this.responses.get(query) ?? []) as Result[];
  }
}

describe('repositories', () => {
  it('maps transactions from sqlite rows into strict app models', async () => {
    const client = new FakeClient();
    client.responses.set('PRAGMA user_version', [{ user_version: 6 }]);
    client.responses.set('SELECT * FROM transactions ORDER BY date DESC', [
      {
        id: 10,
        amount: 1250.5,
        category: 'Food',
        description: 'Dinner',
        date: '2026-03-29 18:45:00',
        type: 'expense',
        imagePath: null,
        groupId: 3,
        walletId: 4,
      },
    ]);

    const repository = createTransactionsRepository(client);
    const transactions = await repository.getAllTransactions();

    expect(transactions[0]).toMatchObject({
      id: 10,
      amount: 1250.5,
      category: 'Food',
      description: 'Dinner',
      type: 'expense',
      groupId: 3,
      walletId: 4,
    });
    expect(transactions[0].date).toBeInstanceOf(Date);
  });

  it('preserves Flutter wallet delete semantics by nulling walletId before deletion', async () => {
    const client = new FakeClient();
    client.responses.set('PRAGMA user_version', [{ user_version: 6 }]);

    const repository = createWalletsRepository(client);
    await repository.deleteWallet(12);

    expect(client.calls).toContainEqual({
      query: 'UPDATE transactions SET walletId = NULL WHERE walletId = ?',
      params: [12],
    });
    expect(client.calls).toContainEqual({
      query: 'DELETE FROM wallets WHERE id = ?',
      params: [12],
    });
  });

  it('preserves Flutter group delete semantics by nulling groupId before deletion', async () => {
    const client = new FakeClient();
    client.responses.set('PRAGMA user_version', [{ user_version: 6 }]);

    const repository = createExpenseGroupsRepository(client);
    await repository.deleteExpenseGroup(7);

    expect(client.calls).toContainEqual({
      query: 'UPDATE transactions SET groupId = NULL WHERE groupId = ?',
      params: [7],
    });
    expect(client.calls).toContainEqual({
      query: 'DELETE FROM expense_groups WHERE id = ?',
      params: [7],
    });
  });

  it('maps wallet visibility from sqlite rows into app models', async () => {
    const client = new FakeClient();
    client.responses.set('PRAGMA user_version', [{ user_version: 6 }]);
    client.responses.set('SELECT * FROM wallets ORDER BY sortOrder ASC, id ASC', [
      {
        id: 3,
        name: 'BPI Savings',
        type: 'Bank',
        colorValue: 16711680,
        isHidden: 1,
        sortOrder: 2,
      },
    ]);

    const repository = createWalletsRepository(client);
    const wallets = await repository.getAllWallets();

    expect(wallets).toEqual([
      {
        id: 3,
        name: 'BPI Savings',
        type: 'Bank',
        colorValue: 16711680,
        isHidden: true,
        sortOrder: 2,
      },
    ]);
  });

  it('appends new wallets to the end of the saved order', async () => {
    const client = new FakeClient();
    client.responses.set('PRAGMA user_version', [{ user_version: 6 }]);
    client.responses.set('SELECT COALESCE(MAX(sortOrder), -1) + 1 AS nextSortOrder FROM wallets', [
      { nextSortOrder: 4 },
    ]);
    client.responses.set('SELECT last_insert_rowid() AS id', [{ id: 9 }]);

    const repository = createWalletsRepository(client);
    await repository.insertWallet({
      name: 'GCash',
      type: 'E-Wallet',
      colorValue: 1234,
      isHidden: false,
    });

    expect(client.calls).toContainEqual({
      query: 'INSERT INTO wallets (name, type, colorValue, isHidden, sortOrder) VALUES (?, ?, ?, ?, ?)',
      params: ['GCash', 'E-Wallet', 1234, 0, 4],
    });
  });

  it('persists reordered wallet positions', async () => {
    const client = new FakeClient();
    client.responses.set('PRAGMA user_version', [{ user_version: 6 }]);

    const repository = createWalletsRepository(client);
    await repository.saveWalletOrder([5, 2, 9]);

    expect(client.calls).toContainEqual({
      query: 'UPDATE wallets SET sortOrder = ? WHERE id = ?',
      params: [0, 5],
    });
    expect(client.calls).toContainEqual({
      query: 'UPDATE wallets SET sortOrder = ? WHERE id = ?',
      params: [1, 2],
    });
    expect(client.calls).toContainEqual({
      query: 'UPDATE wallets SET sortOrder = ? WHERE id = ?',
      params: [2, 9],
    });
  });
});

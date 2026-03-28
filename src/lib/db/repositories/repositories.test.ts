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
    client.responses.set('PRAGMA user_version', [{ user_version: 4 }]);
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
    client.responses.set('PRAGMA user_version', [{ user_version: 4 }]);

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
    client.responses.set('PRAGMA user_version', [{ user_version: 4 }]);

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
});

import { describe, expect, test, vi } from 'vitest';
import { deleteCloudData } from './deleteCloudData';

describe('deleteCloudData', () => {
  test('deletes remotely before clearing local rows and signing out', async () => {
    const order: string[] = [];
    const invokeDelete = vi.fn(async () => {
      order.push('remote');
      return { error: null };
    });
    const clearLocalRows = vi.fn(async () => {
      order.push('local');
    });
    const signOut = vi.fn(async () => {
      order.push('signout');
    });
    const suspendSync = vi.fn(() => order.push('suspend'));
    const resumeSync = vi.fn(() => order.push('resume'));

    await deleteCloudData({ clearLocalRows, invokeDelete, resumeSync, signOut, suspendSync });

    expect(order).toEqual(['suspend', 'remote', 'local', 'resume', 'signout']);
  });

  test('suspends future sync and signs out when the RPC result is ambiguous', async () => {
    const clearLocalRows = vi.fn(async () => undefined);
    const signOut = vi.fn(async () => undefined);
    const suspendSync = vi.fn();
    const resumeSync = vi.fn();

    await expect(deleteCloudData({
      clearLocalRows,
      invokeDelete: vi.fn(async () => ({ error: { message: 'RPC failed' } })),
      resumeSync,
      signOut,
      suspendSync,
    })).rejects.toThrow(/could not confirm.*sync.*paused/i);

    expect(suspendSync).toHaveBeenCalledOnce();
    expect(clearLocalRows).not.toHaveBeenCalled();
    expect(resumeSync).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledOnce();
  });

  test('still signs out if local cleanup fails after cloud deletion', async () => {
    const signOut = vi.fn(async () => undefined);
    const resumeSync = vi.fn();

    await expect(deleteCloudData({
      clearLocalRows: vi.fn(async () => {
        throw new Error('Local cleanup failed');
      }),
      invokeDelete: vi.fn(async () => ({ error: null })),
      resumeSync,
      signOut,
      suspendSync: vi.fn(),
    })).rejects.toThrow(/cloud data was deleted.*signed out/i);

    expect(resumeSync).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledOnce();
  });
});

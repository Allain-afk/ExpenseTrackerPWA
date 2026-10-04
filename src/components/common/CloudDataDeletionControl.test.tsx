import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { CloudDataDeletionControl } from './CloudDataDeletionControl';

afterEach(cleanup);

describe('CloudDataDeletionControl', () => {
  test('requires the exact danger phrase before deleting cloud data', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => undefined);
    render(<CloudDataDeletionControl accountEmail="user@example.com" onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: 'Delete Cloud Data' }));

    expect(screen.getByRole('dialog', { name: 'Permanently delete cloud data?' })).toBeInTheDocument();
    expect(screen.getByText(/does not delete your account/i)).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: 'Permanently Delete Cloud Data' });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByLabelText(/type delete cloud data to confirm/i), 'delete cloud data');
    expect(confirmButton).toBeDisabled();

    await user.clear(screen.getByLabelText(/type delete cloud data to confirm/i));
    await user.type(screen.getByLabelText(/type delete cloud data to confirm/i), 'DELETE CLOUD DATA');
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onDelete).toHaveBeenCalledOnce();
  });

  test('keeps the dialog open and reports a deletion failure', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => {
      throw new Error('Database function is unavailable.');
    });
    render(<CloudDataDeletionControl accountEmail="user@example.com" onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: 'Delete Cloud Data' }));
    await user.type(screen.getByLabelText(/type delete cloud data to confirm/i), 'DELETE CLOUD DATA');
    await user.click(screen.getByRole('button', { name: 'Permanently Delete Cloud Data' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Database function is unavailable.');
    expect(screen.getByRole('dialog', { name: 'Permanently delete cloud data?' })).toBeInTheDocument();
  });
});

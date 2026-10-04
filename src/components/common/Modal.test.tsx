import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, test } from 'vitest';
import { Modal } from './Modal';

afterEach(cleanup);

function ModalHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Open details
      </button>
      <Modal onClose={() => setOpen(false)} open={open} title="Details">
        <button type="button">Edit</button>
        <button type="button">Delete</button>
      </Modal>
    </>
  );
}

describe('Modal keyboard behavior', () => {
  test('traps focus and restores it to the trigger after Escape', async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    const trigger = screen.getByRole('button', { name: 'Open details' });
    await user.click(trigger);

    const closeButton = screen.getByRole('button', { name: 'Close modal' });
    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    expect(closeButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(deleteButton).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test('wraps forward focus from the last control to the first control', async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    await user.click(screen.getByRole('button', { name: 'Open details' }));
    const closeButton = screen.getByRole('button', { name: 'Close modal' });
    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    deleteButton.focus();

    await user.tab();
    expect(closeButton).toHaveFocus();
  });
});

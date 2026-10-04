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

function StackedModalHarness() {
  const [outerOpen, setOuterOpen] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOuterOpen(true)} type="button">Open sheet</button>
      <Modal onClose={() => setOuterOpen(false)} open={outerOpen} title="Sheet">
        <button onClick={() => setInnerOpen(true)} type="button">Open confirmation</button>
      </Modal>
      {innerOpen ? (
        <Modal onClose={() => setInnerOpen(false)} open title="Confirmation">
          <button type="button">Confirm</button>
        </Modal>
      ) : null}
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

  test('only closes the top modal and restores focus through a conditional modal stack', async () => {
    const user = userEvent.setup();
    render(<StackedModalHarness />);

    const sheetTrigger = screen.getByRole('button', { name: 'Open sheet' });
    await user.click(sheetTrigger);
    const confirmationTrigger = screen.getByRole('button', { name: 'Open confirmation' });
    await user.click(confirmationTrigger);

    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Confirmation' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Sheet' })).toBeInTheDocument();
    expect(confirmationTrigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sheetTrigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });
});

import { useState } from 'react';
import type { ExpenseGroup } from '../../types/models';

interface GroupFormProps {
  initialGroup?: ExpenseGroup;
  submitLabel: string;
  loading?: boolean;
  onSubmit: (input: { name: string; description: string }) => Promise<void>;
}

export function GroupForm({
  initialGroup,
  loading = false,
  onSubmit,
  submitLabel,
}: GroupFormProps) {
  const [name, setName] = useState(initialGroup?.name ?? '');
  const [description, setDescription] = useState(initialGroup?.description ?? '');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError('Group name must be at least 2 characters.');
      return;
    }

    setError(null);
    await onSubmit({ name: trimmedName, description: description.trim() });
  }

  return (
    <form className="stack-form" onSubmit={(event) => void handleSubmit(event)}>
      <div className="app-card" style={{ padding: '1rem' }}>
        <div className="form-field">
          <label className="field-label" htmlFor="group-name">
            Group Name
          </label>
          <input
            className="text-input"
            id="group-name"
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g., Food, Transportation, Entertainment"
            value={name}
          />
        </div>
        <div className="form-field" style={{ marginTop: '1rem' }}>
          <label className="field-label" htmlFor="group-description">
            Description
          </label>
          <textarea
            className="text-area"
            id="group-description"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Brief description of this group"
            value={description ?? ''}
          />
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </div>
      <button className="primary-button" disabled={loading} type="submit">
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}

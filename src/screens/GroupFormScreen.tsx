import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { GroupForm } from '../components/forms/GroupForm';
import { PageHeader } from '../components/common/PageHeader';
import { useExpenseGroups } from '../hooks/useExpenseGroups';

export function GroupFormScreen() {
  const navigate = useNavigate();
  const params = useParams();
  const groups = useExpenseGroups();

  const groupId = params.groupId ? Number(params.groupId) : null;
  const existingGroup = groupId ? groups.getGroupById(groupId) : undefined;

  if (params.groupId && !Number.isFinite(groupId ?? NaN)) {
    return <Navigate replace to="/app/groups" />;
  }

  if (params.groupId && !existingGroup) {
    return (
      <main className="app-page">
        <div className="app-card empty-state">
          <h3>Group not found</h3>
          <p>The selected group could not be found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-page">
      <div className="page-content">
        <PageHeader
          backTo="/app/groups"
          title={existingGroup ? 'Edit Group' : 'Add Group'}
        />
        <GroupForm
          initialGroup={existingGroup}
          onSubmit={async ({ description, name }) => {
            const now = new Date();

            if (existingGroup) {
              await groups.updateExpenseGroup({
                ...existingGroup,
                name,
                description: description || null,
                updatedAt: now,
              });
            } else {
              await groups.addExpenseGroup({
                name,
                description: description || null,
                createdAt: now,
                updatedAt: now,
              });
            }

            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/app/groups', { replace: true });
            }
          }}
          submitLabel={existingGroup ? 'Update Group' : 'Create Group'}
        />
      </div>
    </main>
  );
}

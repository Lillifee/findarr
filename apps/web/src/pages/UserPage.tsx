import { useState } from 'react';

import { Button } from '../components/ui/Button';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { CreateUserForm } from '../components/users/CreateUserForm';
import { UserCardList } from '../components/users/UserCardList';
import { useUsers } from '../hooks/useUsers';

export function UsersPage() {
  const { users, createUser, deleteUser } = useUsers();
  const [showCreateForm, setShowCreateForm] = useState(false);

  async function handleDeleteUser(userId: number) {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await deleteUser(userId);
    } catch {
      alert('Failed to delete user');
    }
  }

  return (
    <PageContainer className="py-6 pb-20 md:py-10">
      <div className="space-y-5">
        <PageHeader
          title="Users"
          description="Manage access, roles, and invitations for people using Findarr."
          action={
            <Button
              type="button"
              variant={showCreateForm ? 'secondary' : 'success'}
              size="sm"
              onClick={() => {
                setShowCreateForm(!showCreateForm);
              }}
              className="w-full sm:w-auto"
            >
              {showCreateForm ? 'Cancel' : 'Create user'}
            </Button>
          }
        />

        {showCreateForm && (
          <CreateUserForm
            onCreate={createUser}
            onClose={() => {
              setShowCreateForm(false);
            }}
          />
        )}

        <UserCardList
          users={users}
          onDelete={(userId) => {
            void handleDeleteUser(userId);
          }}
        />
      </div>
    </PageContainer>
  );
}

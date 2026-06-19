import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '../components/ui/Button';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { CreateUserForm } from '../components/users/CreateUserForm';
import { UserCardList } from '../components/users/UserCardList';
import { useUsers } from '../hooks/useUsers';

export function UsersPage() {
  const { t } = useTranslation();
  const { users, createUser, deleteUser } = useUsers();
  const [showCreateForm, setShowCreateForm] = useState(false);

  async function handleDeleteUser(userId: number) {
    if (!confirm(t('users.deleteConfirm'))) {
      return;
    }

    try {
      await deleteUser(userId);
    } catch {
      alert(t('users.deleteError'));
    }
  }

  return (
    <PageContainer>
      <div className="space-y-5">
        <PageHeader
          title={t('users.title')}
          description={t('users.description')}
          action={
            <Button
              type="button"
              variant={showCreateForm ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => {
                setShowCreateForm(!showCreateForm);
              }}
              className="w-full sm:w-auto"
            >
              {showCreateForm ? t('common.cancel') : t('users.createUser')}
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

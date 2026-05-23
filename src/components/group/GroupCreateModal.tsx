import { useState } from 'react';
import { Users } from 'lucide-react';
import { Modal, Button, Input, Textarea } from '@/components/ui';
import { useAuthStore, useGroupStore, useUIStore } from '@/stores';
import { GroupSchema } from '@/lib/validation/schemas';
import toast from 'react-hot-toast';

export function GroupCreateModal() {
  const modal = useUIStore((s) => s.modal);
  const close = useUIStore((s) => s.closeModal);
  const session = useAuthStore((s) => s.session);
  const createGroup = useGroupStore((s) => s.create);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (modal !== 'group_create' || !session) return null;

  const handleCreate = async () => {
    const parsed = GroupSchema.safeParse({ name, description });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path.join('.')] = i.message;
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      const group = await createGroup({
        name: parsed.data.name,
        description: parsed.data.description,
        userId: session.userId,
      });
      toast.success(`Group "${group.name}" created — invite code ${group.inviteCode}`);
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={close}
      title="Create Group"
      subtitle="Roommates, study group, trip… anyone you split costs with."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button onClick={handleCreate} loading={submitting} leftIcon={<Users className="size-4" />}>Create Group</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Group Name"
          placeholder="e.g. Roommates Q302"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors['name']}
          autoFocus
        />
        <Textarea
          label="Description"
          placeholder="Optional — what's this group for?"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors['description']}
        />
      </div>
    </Modal>
  );
}

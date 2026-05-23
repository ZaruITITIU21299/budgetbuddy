import { useState } from 'react';
import { Hash } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';
import { useAuthStore, useGroupStore, useUIStore } from '@/stores';
import toast from 'react-hot-toast';

export function GroupJoinModal() {
  const modal = useUIStore((s) => s.modal);
  const close = useUIStore((s) => s.closeModal);
  const session = useAuthStore((s) => s.session);
  const joinByCode = useGroupStore((s) => s.joinByCode);

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (modal !== 'group_join' || !session) return null;

  const handleJoin = async () => {
    setSubmitting(true);
    try {
      const group = await joinByCode(code.trim().toUpperCase(), session.userId);
      if (!group) {
        toast.error('No group found for that code.');
        return;
      }
      toast.success(`Joined "${group.name}"`);
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to join group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={close}
      size="sm"
      title="Join Group"
      subtitle="Enter the 8-character invite code your group admin shared."
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button onClick={handleJoin} loading={submitting} disabled={code.trim().length < 4}>Join Group</Button>
        </>
      }
    >
      <Input
        label="Invite Code"
        placeholder="e.g. K3M9P2QH"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        leftIcon={<Hash className="size-4" />}
        autoFocus
        maxLength={12}
      />
    </Modal>
  );
}

import { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import { Modal, Button, Badge } from '@/components/ui';
import { useGroupStore, useUIStore } from '@/stores';
import toast from 'react-hot-toast';

export function GroupInviteModal() {
  const modal = useUIStore((s) => s.modal);
  const payload = useUIStore((s) => s.modalPayload) as { groupId: string } | null;
  const close = useUIStore((s) => s.closeModal);
  const groups = useGroupStore((s) => s.groups);

  const [copied, setCopied] = useState(false);

  if (modal !== 'group_invite' || !payload) return null;
  const group = groups.find((g) => g.id === payload.groupId);
  if (!group) return null;

  const link = group.getShareableInviteLink();

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('Copied');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const share = () => {
    if (navigator.share) {
      navigator
        .share({ title: `Join ${group.name} on BudgetBuddy`, text: `Use invite code ${group.inviteCode}`, url: link })
        .catch(() => {});
    } else {
      copy(link);
    }
  };

  return (
    <Modal
      open
      onClose={close}
      size="sm"
      title="Invite to Group"
      subtitle={`Share to add members to "${group.name}"`}
      footer={
        <>
          <Button variant="secondary" onClick={close}>Done</Button>
          <Button leftIcon={<Share2 className="size-4" />} onClick={share}>Share</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">Invite Code</p>
          <button
            onClick={() => copy(group.inviteCode)}
            className="w-full px-5 py-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between font-mono text-2xl font-bold text-emerald-300 tracking-[0.3em] hover:bg-emerald-500/15 transition-colors"
          >
            {group.inviteCode}
            {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
          </button>
        </div>

        <div>
          <p className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">Invite Link</p>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-slate-300 break-all flex items-center justify-between gap-2">
            <span className="truncate">{link}</span>
            <button onClick={() => copy(link)} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <Copy className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Badge variant="info">{group.members.length} members</Badge>
          <span>Anyone with this code can join the group.</span>
        </div>
      </div>
    </Modal>
  );
}

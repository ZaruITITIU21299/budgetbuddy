import { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { ResetPasswordSchema } from '@/lib/validation/schemas';
import toast from 'react-hot-toast';

/**
 * Shown after a user clicks the password-reset link in their email and
 * Supabase fires a `PASSWORD_RECOVERY` event. They pick a new password,
 * we call `auth.updateUser({ password })`, sign them out, and bounce them
 * back to the login screen.
 */
export default function ResetPasswordView() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updatePassword = useAuthStore((s) => s.updatePassword);
  const cancelRecovery = useAuthStore((s) => s.cancelRecovery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = ResetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const out: Record<string, string> = {};
      for (const i of parsed.error.issues) out[i.path.join('.')] = i.message;
      setErrors(out);
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(parsed.data.password);
      toast.success('Password updated. Please sign in with your new password.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#060B1B] px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="flex items-center gap-2.5">
          <div className="size-10 rounded-xl gradient-emerald flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <span className="text-white font-bold">B</span>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">BudgetBuddy</span>
        </div>

        <div className="rounded-3xl border border-white/5 bg-[#0B1224] p-6 sm:p-8 space-y-5">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Choose a new password</h2>
              <p className="text-sm text-slate-400 mt-1">
                Your reset link has been verified. Pick a new password to finish.
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="size-4" />}
              placeholder="At least 6 characters"
              error={errors['password']}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
              autoComplete="new-password"
            />
            <Input
              label="Confirm New Password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="size-4" />}
              error={errors['confirmPassword']}
              autoComplete="new-password"
            />

            <Button type="submit" loading={submitting} className="w-full" size="lg">
              Update Password
            </Button>
          </form>

          <button
            type="button"
            onClick={() => void cancelRecovery()}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-300"
          >
            Cancel and return to sign in
          </button>
        </div>
      </motion.div>
    </div>
  );
}

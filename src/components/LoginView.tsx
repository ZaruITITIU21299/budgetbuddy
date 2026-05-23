import { useState } from 'react';
import { Cloud, Eye, EyeOff, HardDrive, Loader2, Lock, Mail, User2, Wand2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { STORAGE_BACKEND } from '@/lib/storage';
import { LoginSchema, RegisterSchema } from '@/lib/validation/schemas';
import { seedDemoAccount, getDemoCredentials } from '@/lib/services/seed';
import toast from 'react-hot-toast';

type Mode = 'login' | 'register';

export default function LoginView() {
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const setSession = useAuthStore((s) => s.setSession);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (mode === 'login') {
      const parsed = LoginSchema.safeParse({ email, password });
      if (!parsed.success) {
        setErrors(toErrors(parsed.error.issues));
        return;
      }
      setSubmitting(true);
      try {
        await login(parsed.data);
        toast.success(`Welcome back!`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Login failed');
      } finally {
        setSubmitting(false);
      }
    } else {
      const parsed = RegisterSchema.safeParse({ fullName, email, password, confirmPassword });
      if (!parsed.success) {
        setErrors(toErrors(parsed.error.issues));
        return;
      }
      setSubmitting(true);
      try {
        await register({
          fullName: parsed.data.fullName,
          email: parsed.data.email,
          password: parsed.data.password,
        });
        toast.success(`Account created — welcome, ${parsed.data.fullName}!`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Registration failed');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleDemo = async () => {
    setSubmitting(true);
    try {
      const session = await seedDemoAccount();
      await setSession(session);
      toast.success('Demo account loaded with realistic Vietnamese-student data', { duration: 4000 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load demo', { duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-[#060B1B]">
      {/* Visual side */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-500/20 via-[#060B1B] to-sky-500/20">
        <div className="absolute inset-0 opacity-50" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(16,185,129,0.25), transparent 40%), radial-gradient(circle at 80% 70%, rgba(14,165,233,0.2), transparent 40%)'
        }} />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#060B1B] to-transparent" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl gradient-emerald flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="text-white font-bold">B</span>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">BudgetBuddy</span>
          </div>

          <div className="max-w-md">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-bold text-white leading-tight"
            >
              Smart spending for Vietnamese students.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-300 leading-relaxed mt-6"
            >
              Track personal expenses, split bills with roommates, and get AI-powered insights tuned for student life in HCMC, Hà Nội & beyond.
            </motion.p>

            <div className="mt-10 flex flex-wrap gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                AI auto-categorization
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-sky-400" />
                Receipt scanning
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-violet-400" />
                Group bill splitting
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-amber-400" />
                Monthly forecasts
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500">VND-native · Mobile-first · Built as a thesis project at International University, VNU-HCMC</p>
        </div>
      </div>

      {/* Form side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10 bg-[#0B1224]">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md space-y-6"
        >
          <div className="lg:hidden flex items-center gap-2.5 mb-4">
            <div className="size-9 rounded-xl gradient-emerald flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="text-lg font-bold text-white">BudgetBuddy</span>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-3xl font-bold text-white">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <span
                className={
                  STORAGE_BACKEND === 'supabase'
                    ? 'inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : 'inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400'
                }
                title={STORAGE_BACKEND === 'supabase'
                  ? 'Auth + data persist to your Supabase project'
                  : 'Local mode — data lives only in this browser'}
              >
                {STORAGE_BACKEND === 'supabase'
                  ? (<><Cloud className="size-3" /> Supabase</>)
                  : (<><HardDrive className="size-3" /> Local</>)}
              </span>
            </div>
            <p className="text-slate-400 mt-1.5">
              {mode === 'login'
                ? STORAGE_BACKEND === 'supabase'
                  ? 'Sign in to your Supabase-backed account.'
                  : 'Sign in to continue tracking your spending.'
                : STORAGE_BACKEND === 'supabase'
                  ? 'A new auth.users row is created in Supabase.'
                  : 'Free forever — your data stays on this device.'}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                leftIcon={<User2 className="size-4" />}
                placeholder="Nguyễn Thành Tài"
                error={errors['fullName']}
              />
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="size-4" />}
              placeholder="you@hcmiu.edu.vn"
              error={errors['email']}
              autoComplete={mode === 'login' ? 'username' : 'email'}
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="size-4" />}
              placeholder={mode === 'login' ? 'Your password' : 'At least 6 characters'}
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
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {mode === 'register' && (
              <Input
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="size-4" />}
                error={errors['confirmPassword']}
              />
            )}

            <Button type="submit" loading={submitting} className="w-full" size="lg">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0B1224] px-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                Or just try the demo
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDemo}
            disabled={submitting}
            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500/15 to-emerald-500/15 border border-white/10 hover:border-white/20 text-white font-semibold flex items-center justify-center gap-2.5 transition-all"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4 text-violet-300" />}
            Continue as Demo User
          </button>
          <p className="text-[11px] text-slate-500 text-center -mt-2">
            Loads a pre-seeded account with {25}+ realistic VND expenses.
          </p>

          <p className="text-center text-sm text-slate-400">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setMode((m) => (m === 'login' ? 'register' : 'login'));
                setErrors({});
              }}
              className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {mode === 'login' && (
            <p className="text-center text-[11px] text-slate-600">
              Demo credentials: <code>{getDemoCredentials().email}</code> · <code>{getDemoCredentials().password}</code>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function toErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    out[i.path.join('.')] = i.message;
  }
  return out;
}

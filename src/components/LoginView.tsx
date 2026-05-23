import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores';
import {
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
} from '@/lib/validation/schemas';
import toast from 'react-hot-toast';

type Mode = 'login' | 'register' | 'forgot';

export default function LoginView() {
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetSent, setResetSent] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setResetSent(false);
  };

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
    } else if (mode === 'register') {
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
    } else {
      const parsed = ForgotPasswordSchema.safeParse({ email });
      if (!parsed.success) {
        setErrors(toErrors(parsed.error.issues));
        return;
      }
      setSubmitting(true);
      try {
        await requestPasswordReset(parsed.data.email);
        setResetSent(true);
        toast.success('Reset link sent — check your inbox.');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not send reset email');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const headline = mode === 'login'
    ? 'Welcome back'
    : mode === 'register'
      ? 'Create your account'
      : 'Reset your password';

  const subhead = mode === 'login'
    ? 'Sign in to your account.'
    : mode === 'register'
      ? 'Create an account to start tracking your spending.'
      : 'Enter your email and we\u2019ll send you a link to set a new password.';

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

          <p className="text-xs text-slate-500">VND-native · Mobile-first · Built for everyday student life</p>
        </div>
      </div>

      {/* Form side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10 bg-[#0B1224]">
        <motion.div
          key={mode}
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
            <h2 className="text-3xl font-bold text-white">{headline}</h2>
            <p className="text-slate-400 mt-1.5">{subhead}</p>
          </div>

          {mode === 'forgot' && resetSent ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
              <p className="text-sm text-emerald-200">
                We sent a reset link to <strong>{email}</strong>. Click the link
                in the email to choose a new password. The link expires in 1
                hour.
              </p>
              <p className="text-xs text-slate-400">
                Didn&apos;t get it? Check your spam folder, or{' '}
                <button
                  type="button"
                  onClick={() => setResetSent(false)}
                  className="font-bold text-emerald-300 hover:text-emerald-200"
                >
                  try a different email
                </button>
                .
              </p>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400 hover:text-emerald-300"
              >
                <ArrowLeft className="size-4" /> Back to sign in
              </button>
            </div>
          ) : (
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
                placeholder="you@email.com"
                error={errors['email']}
                autoComplete={mode === 'login' ? 'username' : 'email'}
              />
              {mode !== 'forgot' && (
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
              )}
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

              {mode === 'login' && (
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button type="submit" loading={submitting} className="w-full" size="lg">
                {mode === 'login'
                  ? 'Sign In'
                  : mode === 'register'
                    ? 'Create Account'
                    : 'Send Reset Link'}
              </Button>
            </form>
          )}

          {mode === 'forgot' && !resetSent && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400 hover:text-emerald-300"
            >
              <ArrowLeft className="size-4" /> Back to sign in
            </button>
          )}

          {mode !== 'forgot' && (
            <p className="text-center text-sm text-slate-400">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
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

import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
};

const GRADIENTS = [
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-indigo-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
];

function pickGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const gradient = pickGradient(name);
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(SIZES[size], 'rounded-full object-cover ring-2 ring-white/10', className)}
      />
    );
  }
  return (
    <div
      className={cn(
        SIZES[size],
        'rounded-full bg-gradient-to-br text-white font-bold flex items-center justify-center shrink-0 ring-2 ring-white/10',
        gradient,
        className,
      )}
      title={name}
    >
      {initials || '?'}
    </div>
  );
}

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'dark' | 'outline';
  className?: string;
}

export default function Badge({ children, variant = 'dark', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
        {
          'bg-gold/20 text-gold border border-gold/30': variant === 'gold',
          'bg-jet-slate/60 text-white/70 border border-white/10': variant === 'dark',
          'border border-gold/30 text-gold': variant === 'outline',
        },
        className
      )}
    >
      {children}
    </span>
  );
}

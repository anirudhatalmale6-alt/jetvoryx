'use client';

import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'outline' | 'ghost' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'gold', size = 'md', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-gold-gradient text-jet-black hover:shadow-lg hover:shadow-gold/20 hover:scale-[1.02] active:scale-[0.98]':
              variant === 'gold',
            'border border-gold/30 text-gold hover:bg-gold/10 hover:border-gold/60':
              variant === 'outline',
            'text-white/70 hover:text-white hover:bg-white/5':
              variant === 'ghost',
            'bg-jet-charcoal text-white border border-white/10 hover:border-white/20 hover:bg-jet-slate':
              variant === 'dark',
          },
          {
            'text-sm px-4 py-2': size === 'sm',
            'text-sm px-6 py-3': size === 'md',
            'text-base px-8 py-4': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;

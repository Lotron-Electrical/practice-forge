import { type ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-pf-gold text-white hover:opacity-90',
  secondary: 'bg-[var(--pf-bg-hover)] text-[var(--pf-text-primary)] hover:bg-[var(--pf-bg-active)] border border-[var(--pf-border-color)]',
  ghost: 'bg-transparent text-[var(--pf-text-secondary)] hover:bg-[var(--pf-bg-hover)] hover:text-[var(--pf-text-primary)]',
  danger: 'bg-pf-coral text-white hover:opacity-90',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-pf transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      style={{ transitionDuration: 'var(--pf-animation-duration)' }}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = 'Button';

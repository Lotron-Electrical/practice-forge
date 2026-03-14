import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const baseClasses = 'w-full px-3 py-2 min-h-[44px] rounded-pf-sm border border-[var(--pf-border-color)] bg-[var(--pf-bg-input)] text-[var(--pf-text-primary)] placeholder:text-[var(--pf-text-secondary)] focus-visible:ring-0 transition-colors';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string }>(
  ({ label, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={inputId} className="text-sm font-medium text-[var(--pf-text-secondary)]">{label}</label>}
        <input ref={ref} id={inputId} className={`${baseClasses} ${className}`} {...props} />
      </div>
    );
  }
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }>(
  ({ label, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={inputId} className="text-sm font-medium text-[var(--pf-text-secondary)]">{label}</label>}
        <textarea ref={ref} id={inputId} className={`${baseClasses} resize-y min-h-[80px] ${className}`} {...props} />
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export function Select({ label, className = '', id, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-[var(--pf-text-secondary)]">{label}</label>}
      <select id={inputId} className={`${baseClasses} ${className}`} {...props}>
        {children}
      </select>
    </div>
  );
}

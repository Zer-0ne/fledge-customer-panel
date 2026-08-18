import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, checked, onChange, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <label htmlFor={inputId} className="inline-flex items-center gap-2 cursor-pointer select-none">
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            id={inputId}
            checked={checked}
            onChange={onChange}
            className={cn(
              'peer size-4 appearance-none rounded border border-input bg-background checked:bg-primary checked:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
              className
            )}
            ref={ref}
            {...props}
          />
          <Check className="pointer-events-none hidden size-3 text-primary-foreground peer-checked:block stroke-[3]" />
        </div>
        {label && <span className="text-sm font-medium leading-none">{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };

'use client';

import { ReactNode, forwardRef } from 'react';

// Form Field Container
interface FormFieldProps {
  children: ReactNode;
  error?: string;
  required?: boolean;
}

export function FormField({ children, error }: FormFieldProps) {
  return (
    <div className="space-y-2">
      {children}
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// Label Component
interface LabelProps {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}

export function Label({ htmlFor, children, required, className = '' }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-card-foreground ${className}`}
    >
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
  );
}

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full px-3 py-2.5 bg-background text-foreground border rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] placeholder:text-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${
          error
            ? 'border-destructive focus:ring-destructive/20'
            : 'border-input hover:border-input/80'
        } ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full px-3 py-2.5 bg-background text-foreground border rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] placeholder:text-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none ${
          error
            ? 'border-destructive focus:ring-destructive/20'
            : 'border-input hover:border-input/80'
        } ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

// Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full px-3 py-2.5 bg-background text-foreground border rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${
          error
            ? 'border-destructive focus:ring-destructive/20'
            : 'border-input hover:border-input/80'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';

// Button Components
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90 focus:ring-ring',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive',
    ghost: 'text-muted-foreground hover:text-foreground hover:bg-accent focus:ring-ring',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}

// Alert Component
interface AlertProps {
  variant?: 'success' | 'error' | 'warning' | 'info';
  children: ReactNode;
  onClose?: () => void;
}

export function Alert({ variant = 'info', children, onClose }: AlertProps) {
  const variants = {
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-700',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    error: {
      bg: 'bg-destructive/10 border-destructive/20',
      text: 'text-destructive',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-700',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const { bg, text, icon } = variants[variant];

  return (
    <div className={`border px-4 py-3 rounded-[var(--radius-md)] ${bg}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${text}`}>
          {icon}
        </div>
        <div className={`flex-1 ${text}`}>
          {children}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`flex-shrink-0 ${text} hover:opacity-70 transition-opacity duration-200`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Loading Spinner Component
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <svg className={`animate-spin ${sizes[size]} text-muted-foreground`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
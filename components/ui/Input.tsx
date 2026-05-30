import React from 'react'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  size?: 'sm' | 'md'
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, size = 'md', className = '', ...props }, ref) => {
    const sizeClasses = size === 'sm' ? 'text-xs px-2.5 py-1.5' : 'text-sm px-3 py-2'
    return (
      <div className="w-full">
        {label && (
          <label className={`block font-semibold text-zinc-500 mb-1 dark:text-zinc-400 uppercase tracking-wide ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-white border border-border-custom rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent dark:bg-card-custom dark:border-border-custom dark:text-zinc-100 dark:placeholder-zinc-500 transition-all ${sizeClasses} ${
            error ? 'border-rose-500 focus:ring-rose-500' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-rose-500 font-medium">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'


import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold text-zinc-500 mb-1 dark:text-zinc-400 uppercase tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent dark:bg-card-custom dark:border-border-custom dark:text-zinc-100 dark:placeholder-zinc-500 transition-all ${
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

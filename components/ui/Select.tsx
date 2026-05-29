import React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { label: string; value: string | number }[]
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold text-zinc-500 mb-1 dark:text-zinc-400 uppercase tracking-wide">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent dark:bg-card-custom dark:border-border-custom dark:text-zinc-100 transition-all cursor-pointer ${
            error ? 'border-rose-500 focus:ring-rose-500' : ''
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-xs text-rose-500 font-medium">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary-accent dark:bg-primary dark:text-zinc-950 dark:hover:bg-primary-hover dark:focus:ring-primary-accent',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 focus:ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:focus:ring-zinc-600',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 dark:bg-rose-500 dark:hover:bg-rose-600 dark:focus:ring-rose-400',
    ghost: 'text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
    outline: 'border border-border-custom text-zinc-700 hover:bg-zinc-50 focus:ring-primary-accent dark:border-border-custom dark:text-zinc-300 dark:hover:bg-zinc-900/50'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base'
  }

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

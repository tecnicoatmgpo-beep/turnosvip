import React from 'react'

type EmptyStateVariant = 'appointments' | 'clients' | 'services' | 'products' | 'sales' | 'reminders' | 'generic'

const illustrations: Record<EmptyStateVariant, React.ReactNode> = {
  appointments: (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-24">
      <rect x="20" y="18" width="80" height="68" rx="10" fill="currentColor" className="text-primary/8 dark:text-primary/10" />
      <rect x="20" y="18" width="80" height="20" rx="10" fill="currentColor" className="text-primary/15 dark:text-primary/20" />
      <rect x="20" y="28" width="80" height="10" fill="currentColor" className="text-primary/15 dark:text-primary/20" />
      <line x1="38" y1="10" x2="38" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary/50" />
      <line x1="82" y1="10" x2="82" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary/50" />
      <rect x="32" y="48" width="16" height="10" rx="3" fill="currentColor" className="text-primary/25" />
      <rect x="52" y="48" width="16" height="10" rx="3" fill="currentColor" className="text-primary/15" />
      <rect x="72" y="48" width="16" height="10" rx="3" fill="currentColor" className="text-primary/15" />
      <rect x="32" y="64" width="16" height="10" rx="3" fill="currentColor" className="text-primary/15" />
      <rect x="52" y="64" width="16" height="10" rx="3" fill="currentColor" className="text-primary/25" />
      <circle cx="88" cy="78" r="14" fill="currentColor" className="text-primary/15" />
      <line x1="88" y1="72" x2="88" y2="78" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary/60" />
      <line x1="88" y1="78" x2="92" y2="82" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary/60" />
    </svg>
  ),
  clients: (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-24">
      <circle cx="50" cy="36" r="18" fill="currentColor" className="text-primary/12" />
      <circle cx="50" cy="30" r="9" fill="currentColor" className="text-primary/25" />
      <path d="M28 72c0-12.15 9.85-22 22-22s22 9.85 22 22" fill="currentColor" className="text-primary/15" />
      <circle cx="80" cy="50" r="12" fill="currentColor" className="text-primary/10" />
      <circle cx="80" cy="45" r="6" fill="currentColor" className="text-primary/20" />
      <path d="M66 72c0-7.73 6.27-14 14-14s14 6.27 14 14" fill="currentColor" className="text-primary/12" />
      <circle cx="88" cy="80" r="13" fill="currentColor" className="text-primary/20" />
      <line x1="84" y1="80" x2="92" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary/60" />
      <line x1="88" y1="76" x2="88" y2="84" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary/60" />
    </svg>
  ),
  services: (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-24">
      <circle cx="60" cy="50" r="32" fill="currentColor" className="text-primary/8" />
      <path d="M42 38 L54 62 M54 38 L42 62" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-primary/35" />
      <circle cx="42" cy="38" r="5" fill="currentColor" className="text-primary/30" />
      <circle cx="54" cy="38" r="5" fill="currentColor" className="text-primary/30" />
      <path d="M65 42 Q72 50 65 58" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" className="text-primary/40" />
      <path d="M71 38 Q82 50 71 62" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" className="text-primary/25" />
      <circle cx="86" cy="78" r="13" fill="currentColor" className="text-primary/20" />
      <line x1="82" y1="78" x2="90" y2="78" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary/60" />
      <line x1="86" y1="74" x2="86" y2="82" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary/60" />
    </svg>
  ),
  products: (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-24">
      <rect x="30" y="45" width="60" height="40" rx="6" fill="currentColor" className="text-primary/10" />
      <path d="M30 51 L60 35 L90 51" fill="currentColor" className="text-primary/18" />
      <rect x="48" y="60" width="24" height="25" rx="3" fill="currentColor" className="text-primary/20" />
      <rect x="36" y="57" width="14" height="12" rx="2" fill="currentColor" className="text-primary/15" />
      <rect x="70" y="57" width="14" height="12" rx="2" fill="currentColor" className="text-primary/15" />
      <circle cx="88" cy="32" r="13" fill="currentColor" className="text-primary/15" />
      <line x1="84" y1="32" x2="92" y2="32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary/60" />
      <line x1="88" y1="28" x2="88" y2="36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary/60" />
    </svg>
  ),
  sales: (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-24">
      <rect x="22" y="30" width="76" height="55" rx="8" fill="currentColor" className="text-primary/8" />
      <rect x="22" y="30" width="76" height="16" rx="8" fill="currentColor" className="text-primary/15" />
      <rect x="22" y="38" width="76" height="8" fill="currentColor" className="text-primary/15" />
      <line x1="34" y1="58" x2="86" y2="58" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary/20" />
      <line x1="34" y1="68" x2="86" y2="68" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary/20" />
      <line x1="34" y1="78" x2="70" y2="78" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary/20" />
      <rect x="34" y="54" width="10" height="8" rx="1.5" fill="currentColor" className="text-primary/25" />
      <circle cx="86" cy="80" r="13" fill="currentColor" className="text-primary/20" />
      <line x1="82" y1="80" x2="90" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary/60" />
      <line x1="86" y1="76" x2="86" y2="84" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary/60" />
    </svg>
  ),
  reminders: (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-24">
      <path d="M60 20 C45 20 33 32 33 47 L33 62 L26 70 L94 70 L87 62 L87 47 C87 32 75 20 60 20Z" fill="currentColor" className="text-primary/12" />
      <rect x="26" y="68" width="68" height="6" rx="3" fill="currentColor" className="text-primary/20" />
      <path d="M52 74 Q60 82 68 74" fill="currentColor" className="text-primary/25" />
      <circle cx="60" cy="18" r="4" fill="currentColor" className="text-primary/35" />
      <circle cx="84" cy="34" r="13" fill="currentColor" className="text-primary/20" />
      <path d="M84 28 L84 35 L89 38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/60" />
    </svg>
  ),
  generic: (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-24">
      <circle cx="60" cy="48" r="30" fill="currentColor" className="text-primary/10" />
      <circle cx="60" cy="48" r="20" fill="currentColor" className="text-primary/15" />
      <line x1="60" y1="36" x2="60" y2="50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary/50" />
      <circle cx="60" cy="57" r="2.5" fill="currentColor" className="text-primary/50" />
      <line x1="38" y1="80" x2="82" y2="80" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary/20" />
      <line x1="46" y1="88" x2="74" y2="88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary/12" />
    </svg>
  ),
}

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
}

export default function EmptyState({
  variant = 'generic',
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center animate-fade-in-up ${
      compact ? 'py-8 px-4' : 'py-14 px-6'
    }`}>
      <div className="mb-4 opacity-90">
        {illustrations[variant]}
      </div>
      <p className={`font-semibold text-zinc-700 dark:text-zinc-200 ${compact ? 'text-sm' : 'text-base'}`}>
        {title}
      </p>
      {description && (
        <p className={`text-zinc-400 dark:text-zinc-500 mt-1.5 max-w-xs ${compact ? 'text-xs' : 'text-sm'}`}>
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  )
}

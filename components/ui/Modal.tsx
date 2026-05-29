import React from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-card-custom border border-border-custom dark:border-border-custom rounded-xl shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-155">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-custom dark:border-border-custom">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-4 flex-1 overflow-y-auto max-h-[80vh]">{children}</div>
      </div>
    </div>
  )
}

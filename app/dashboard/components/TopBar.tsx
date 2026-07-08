'use client'

import { UserButton } from '@clerk/nextjs'

interface TopBarProps {
  onMenuClick: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <header className="h-14 bg-white border-b border-ink-navy/10 flex items-center justify-between px-4 shrink-0">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg text-ink-navy/50 hover:bg-mist transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex items-center gap-3">
        <button className="text-sm text-ink-navy/50 hover:text-ink-navy transition-colors">
          🔔
        </button>
        <UserButton />
      </div>
    </header>
  )
}

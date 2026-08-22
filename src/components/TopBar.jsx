/**
 * TOPBAR — the strip across the top of every page.
 *
 * Holds the page title, a live UTC clock (polar operations run on UTC,
 * not local time), and a red pill showing how many things currently need
 * attention. That pill is counted from the shared data, so it changes by
 * itself the moment anything anywhere changes.
 */

import { useEffect, useState } from 'react'
import { AlertTriangle, Menu } from 'lucide-react'
import { formatUtcClock } from '../lib/format'
import { useData } from '../store/DataContext'

export default function TopBar({ title, blurb, onMenuClick, onAlertClick }) {
  const { stats } = useData()

  /* A clock that actually ticks. setInterval updates it once a second and
     the cleanup function stops it when the component goes away — leaving
     that out is one of the classic React memory leaks. */
  const [clock, setClock] = useState(() => formatUtcClock())
  useEffect(() => {
    const timer = setInterval(() => setClock(formatUtcClock()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-3 border-b bg-[var(--navy-900)]/95 px-4 py-3 backdrop-blur sm:px-6"
      style={{ borderColor: 'var(--line)' }}
    >
      {/* Hamburger — only shown on small screens. */}
      <button
        type="button"
        onClick={onMenuClick}
        className="shrink-0 text-mid hover:text-hi lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="page-title truncate">{title}</h1>
        {blurb && <p className="page-blurb hidden truncate sm:block">{blurb}</p>}
      </div>

      {/* Alert pill. Only appears when there is genuinely something open. */}
      {stats.criticalAlerts > 0 && (
        <button
          type="button"
          onClick={onAlertClick}
          className="badge badge--critical shrink-0"
          title="Go to Emergency Response"
        >
          <AlertTriangle size={12} strokeWidth={2.25} className="pulse" />
          <span className="hidden sm:inline">
            {stats.criticalAlerts} alert{stats.criticalAlerts === 1 ? '' : 's'}
          </span>
          <span className="sm:hidden">{stats.criticalAlerts}</span>
        </button>
      )}

      {/* UTC clock. */}
      <div className="hidden shrink-0 text-right md:block">
        <div className="eyebrow">Mission time</div>
        <div className="mono text-[13px] text-hi">{clock}</div>
      </div>
    </header>
  )
}

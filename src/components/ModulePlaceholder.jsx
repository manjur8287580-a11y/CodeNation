/**
 * MODULEPLACEHOLDER — a tidy "not built yet" panel.
 *
 * We are building this project in phases. Rather than leaving unfinished
 * pages blank (or worse, crashing), each one shows this panel: what the
 * module will contain, and a live count from the shared data so you can
 * already see the records are loaded and waiting.
 *
 * Every one of these gets deleted as its real page is written.
 */

import { Construction } from 'lucide-react'
import Panel from './Panel'

export default function ModulePlaceholder({ phase, title, records, recordLabel, features }) {
  return (
    <Panel eyebrow={`Phase ${phase}`} title={title} subtitle="This module is not built yet.">
      <div className="flex flex-col items-center gap-1 py-6 text-center">
        <Construction size={22} strokeWidth={1.5} className="mb-1 text-[var(--ink-low)]" />
        <div className="text-[13px] text-mid">Scheduled for Phase {phase}.</div>
        {records != null && (
          <div className="mono text-[12px] text-[var(--ice)]">
            {records} {recordLabel} already loaded in the shared store
          </div>
        )}
      </div>

      {features?.length > 0 && (
        <ul className="mx-auto max-w-md space-y-1.5 border-t pt-4" style={{ borderColor: 'var(--line-soft)' }}>
          {features.map((feature) => (
            <li key={feature} className="flex gap-2 text-[12.5px] text-mid">
              <i className="dot dot--muted mt-1.5 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/**
 * THE SIGN-IN SCREEN
 * ==================
 * The first thing anybody sees. It picks a role, and that role decides which
 * controls the rest of the console shows.
 *
 * READ THIS BEFORE DEMOING IT — it is the honest description, and it is
 * printed on the screen too so nobody has to take our word for it:
 *
 *   There is no password, because nothing is being verified. This screen
 *   chooses a role; it does not authenticate anyone. A password box that
 *   accepts whatever you type looks like security that is not there, which
 *   is worse than admitting there is none.
 *
 *   The full reasoning, and where a real sign-in would go, is at the top of
 *   src/lib/roles.js.
 *
 * WHAT IS WORTH POINTING AT HERE:
 *   1. The four access summaries under the role list are not typed out. They
 *      are read from the same canManage / canRespond flags that App.jsx and
 *      every page check, so the screen cannot promise something the app then
 *      does not do.
 *   2. The counts on the left are read from the real shared store, so the
 *      sign-in screen is already showing live figures from the data the
 *      dashboard is about to show.
 */

import { useState } from 'react'
import { Check, Lock, Minus, Radio } from 'lucide-react'
import { useAuth } from '../store/AuthContext'
import { useData } from '../store/DataContext'
import { ROLES, ROLE_KEYS } from '../lib/roles'
import { TONE_COLOUR } from '../lib/statuses'

/* The four pre-filled names. Used to work out whether the name box still
   holds a suggestion (safe to swap when the role changes) or something the
   operator typed themselves (never overwrite that). */
const SUGGESTED_NAMES = new Set(ROLE_KEYS.map((key) => ROLES[key].operator))

/**
 * The three lines of access summary shown under the role list.
 *
 * Each line is DERIVED from the role's flags rather than written out, for
 * the same reason the dashboard counts its own alerts: a sentence that is
 * typed by hand can end up disagreeing with the code beside it.
 *
 * The third line is always allowed, and always says so. See the note in
 * src/lib/roles.js about why reporting an emergency is never gated.
 */
function accessSummary(role) {
  return [
    {
      allowed: role.canManage,
      text: role.canManage
        ? 'Edit expeditions, roster, cargo and stock'
        : 'Cannot change any record',
    },
    {
      allowed: role.canRespond,
      text: role.canRespond
        ? 'Acknowledge and resolve incidents'
        : 'Cannot acknowledge or resolve incidents',
    },
    { allowed: true, text: 'Report an emergency' },
  ]
}

export default function Login() {
  const { signIn, signingIn, authError, clearAuthError, defaultRole } = useAuth()
  const { stats, loading } = useData()

  const [roleKey, setRoleKey] = useState(defaultRole)
  const [name, setName] = useState(ROLES[defaultRole].operator)

  const role = ROLES[roleKey]
  const RoleIcon = role.icon
  /* A colour chosen from data at run time, so it has to be a literal rather
     than a CSS variable — the same situation the incident severity stripe is
     in. See the comment above TONE_COLOUR in src/lib/statuses.js. */
  const roleColour = TONE_COLOUR[role.tone]

  /** Picking a role also swaps the suggested name — unless you typed one. */
  function chooseRole(key) {
    setRoleKey(key)
    setName((current) => (SUGGESTED_NAMES.has(current.trim()) ? ROLES[key].operator : current))
    clearAuthError()
  }

  function handleSubmit(event) {
    event.preventDefault()
    signIn({ name, role: roleKey })
  }

  /* The figures on the left. Shown as an em dash for the 350ms the store
     spends "loading", rather than flashing zeros that are not true yet. */
  const figure = (value) => (loading ? '—' : value)

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6"
      /* ONE restrained glow behind the card, not a gradient everywhere
         (master prompt section 20). It reads as a light on a dark console
         rather than as decoration. */
      style={{
        background:
          'radial-gradient(900px 520px at 22% 12%, rgba(111,214,214,0.09), transparent 62%), var(--navy-950)',
      }}
    >
      <div className="fade-up grid w-full max-w-[960px] gap-5 lg:grid-cols-[1fr_400px] lg:items-start">
        {/* ==================== LEFT: WHAT THIS IS ==================== */}
        <div className="lg:pt-3">
          <div className="flex items-start gap-3">
            <Radio size={30} strokeWidth={1.6} className="mt-1 shrink-0 text-[var(--ice)]" />
            <div>
              <h1 className="font-display text-[27px] font-semibold uppercase leading-none tracking-[0.06em] text-hi sm:text-[33px]">
                Polar Command Center
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-mid">
                Integrated Polar Expedition Logistics &amp; Asset Management System
              </p>
              <p className="eyebrow mt-2">
                Ministry of Earth Sciences · NCPOR · Problem Statement 26062
              </p>
            </div>
          </div>

          <p className="mt-6 max-w-[440px] text-[13px] leading-relaxed text-mid">
            One console for the things a polar station cannot afford to lose track of — who is
            deployed, what is in transit, what is running out, and what has gone wrong. Every
            module reads the same records, so a change made in one is visible in all of them.
          </p>

          {/* ---------- Figures read from the real store ----------
              Not decoration: these come from the same `stats` object the
              dashboard uses, which is why the console is already showing
              true numbers before anybody has signed in. */}
          <dl className="mt-6 grid max-w-[440px] grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {[
              { label: 'Expeditions', value: figure(stats.expeditionsTotal) },
              { label: 'Personnel', value: figure(stats.personnelTotal) },
              { label: 'Consignments', value: figure(stats.cargoTotal) },
              {
                label: 'Open incidents',
                value: figure(stats.emergenciesOpen),
                tone: stats.emergenciesOpen > 0 ? 'alert' : null,
              },
            ].map((item) => (
              <div key={item.label}>
                <dd
                  className="font-display text-[24px] font-semibold leading-none"
                  style={{ color: item.tone ? TONE_COLOUR[item.tone] : 'var(--ink-hi)' }}
                >
                  {item.value}
                </dd>
                <dt className="eyebrow mt-1.5">{item.label}</dt>
              </div>
            ))}
          </dl>

          {/* ---------- The standing honesty note (section 21) ---------- */}
          <p className="mt-7 max-w-[440px] text-[11.5px] leading-relaxed text-low">
            Prototype build. Positions are <span className="text-mid">simulated</span> demo data,
            not live GPS or beacon feeds. Weather is fetched live from Open-Meteo where it is
            reachable, and clearly marked as fallback figures where it is not.
          </p>
        </div>

        {/* ==================== RIGHT: THE SIGN-IN CARD ==================== */}
        <form className="card" onSubmit={handleSubmit} noValidate>
          <div className="eyebrow">Console access</div>
          <h2 className="mt-1 font-display text-[19px] font-semibold tracking-[0.03em] text-hi">
            Sign In
          </h2>
          <p className="mt-1 text-[11.5px] leading-relaxed text-low">
            Choose the role you are signing in as. It decides which controls the console shows
            you.
          </p>

          {/* ---------- The four roles ---------- */}
          <div className="mt-4 space-y-2">
            {ROLE_KEYS.map((key) => {
              const option = ROLES[key]
              const OptionIcon = option.icon
              const active = key === roleKey
              const colour = TONE_COLOUR[option.tone]

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => chooseRole(key)}
                  /* "login-role--active" is written out in full here, which
                     is what stops Tailwind purging it. Compare the badge
                     classes, which are built at run time and therefore need
                     the safelist in tailwind.config.js. */
                  className={`login-role ${active ? 'login-role--active' : ''}`}
                  style={active ? { borderColor: colour, boxShadow: `inset 3px 0 0 ${colour}` } : undefined}
                  aria-pressed={active}
                >
                  <OptionIcon
                    size={16}
                    strokeWidth={1.75}
                    className="mt-0.5 shrink-0"
                    style={{ color: active ? colour : 'var(--ink-low)' }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold text-hi">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-low">
                      {option.remit}
                    </span>
                  </span>
                  {active && (
                    <Check size={14} strokeWidth={2.5} className="mt-0.5 shrink-0" style={{ color: colour }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* ---------- What the chosen role may do ----------
              Derived from the role's flags, never typed out. */}
          <div
            className="mt-3 rounded border p-3"
            style={{ borderColor: 'var(--line)', background: 'var(--navy-850)' }}
          >
            <div className="flex items-center gap-2">
              <RoleIcon size={13} strokeWidth={2} style={{ color: roleColour }} />
              <span className="eyebrow" style={{ color: roleColour }}>
                {role.label} may
              </span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {accessSummary(role).map((line) => (
                <li key={line.text} className="flex items-start gap-2 text-[11.5px] leading-snug">
                  {line.allowed ? (
                    <Check
                      size={12}
                      strokeWidth={2.5}
                      className="mt-0.5 shrink-0 text-[var(--green)]"
                    />
                  ) : (
                    <Minus size={12} strokeWidth={2.5} className="mt-0.5 shrink-0 text-low" />
                  )}
                  <span className={line.allowed ? 'text-mid' : 'text-low'}>{line.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ---------- Operator name ---------- */}
          <div className="mt-4">
            <label className="field-label" htmlFor="login-name">
              Operator name
            </label>
            <input
              id="login-name"
              className="input"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                clearAuthError()
              }}
              placeholder="Who is on the console?"
              autoComplete="off"
              maxLength={48}
            />
            <p className="mt-1.5 text-[11px] text-low">
              Shown in the sidebar so it is always clear whose session this is. The suggested
              names are fictional.
            </p>
          </div>

          {/* ---------- The error state (section 15) ---------- */}
          {authError && (
            <div className="alert-strip mt-3">
              <span className="text-[12px] leading-relaxed text-hi">{authError}</span>
            </div>
          )}

          {/* ---------- Submit ---------- */}
          <button type="submit" className="btn mt-4 w-full" disabled={signingIn}>
            {signingIn ? (
              <>
                <Radio size={14} className="pulse" /> Signing in…
              </>
            ) : (
              <>
                <Lock size={14} /> Enter Console
              </>
            )}
          </button>

          {/* ---------- The honest note about what this is not ----------
              Deliberately on the screen and not only in a code comment. */}
          <div className="mt-4 flex items-start gap-2 border-t pt-3" style={{ borderColor: 'var(--line)' }}>
            <Lock size={13} className="mt-0.5 shrink-0 text-low" />
            <p className="text-[11px] leading-relaxed text-low">
              <span className="text-mid">Demo sign-in.</span> No password is checked and nothing is
              verified — this screen selects a role, it does not authenticate anyone. A real
              deployment would put NCPOR sign-in in front of this and enforce these rules on the
              server as well.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * APP — the layout, the sign-in gate, and the thing that decides which page
 * is on screen.
 *
 * HOW NAVIGATION WORKS HERE (and why it looks so simple):
 *   We keep the name of the current page in a single piece of state:
 *       const [view, setView] = useState('dashboard')
 *   Clicking a sidebar link calls setView('cargo'), and the switch
 *   statement below renders the Cargo page.
 *
 *   Most tutorials would reach for React Router here. We deliberately do
 *   not: this is a single-screen operations console with eight panes, so
 *   one line of state does the same job with no extra dependency and
 *   nothing new to explain. (Master prompt section 18 — don't overengineer.)
 *
 * THE SIGN-IN GATE:
 *   If nobody is signed in, this file renders the sign-in screen INSTEAD of
 *   the console — one `if` near the top of the component. That is the whole
 *   gate. It is not a security boundary and does not pretend to be; see the
 *   comment at the top of src/lib/roles.js for the honest version.
 *
 * THE LAYOUT: sidebar on the left, top bar across, page content below.
 */

import { useState } from 'react'
import { CloudOff, Eye } from 'lucide-react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import ErrorBoundary from './components/ErrorBoundary'
import { findNavItem } from './lib/navigation'
import { useAuth } from './store/AuthContext'
import { useData } from './store/DataContext'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Expeditions from './pages/Expeditions'
import Personnel from './pages/Personnel'
import Cargo from './pages/Cargo'
import Inventory from './pages/Inventory'
import MapView from './pages/MapView'
import Weather from './pages/Weather'
import Emergency from './pages/Emergency'

export default function App() {
  /* Who is signed in, and what they may change. */
  const { user, canManage } = useAuth()

  /* Whether the database is keeping up. `dbNotice` is null unless a database
     is configured AND something went wrong with it, so on demo data — the
     default — it is always null and the strip below never renders. */
  const { dbNotice, dismissDbNotice, reload } = useData()

  /* Which module is on screen. */
  const [view, setView] = useState('dashboard')

  /* Whether the mobile drawer is open. Ignored on desktop. */
  const [navOpen, setNavOpen] = useState(false)

  /* Used when one page wants to send you to another — e.g. clicking the
     "Low Stock" card on the dashboard takes you to Inventory. This is a
     small thing that makes the app feel joined up rather than like eight
     separate screens. */
  const goTo = (nextView) => {
    setView(nextView)
    setNavOpen(false)
    window.scrollTo({ top: 0 })
  }

  const nav = findNavItem(view)

  /* THE GATE. Nobody signed in means the sign-in screen and nothing else —
     no sidebar, no top bar, no data pages mounted behind it. */
  if (!user) return <Login />

  /* Pick the page component for the current view. Every page receives
     goTo so it can link elsewhere in the console. */
  function renderPage() {
    switch (view) {
      case 'dashboard':
        return <Dashboard goTo={goTo} />
      case 'expeditions':
        return <Expeditions goTo={goTo} />
      case 'personnel':
        return <Personnel goTo={goTo} />
      case 'cargo':
        return <Cargo goTo={goTo} />
      case 'inventory':
        return <Inventory goTo={goTo} />
      case 'map':
        return <MapView goTo={goTo} />
      case 'weather':
        return <Weather goTo={goTo} />
      case 'emergency':
        return <Emergency goTo={goTo} />
      default:
        return <Dashboard goTo={goTo} />
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        view={view}
        onNavigate={goTo}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />

      {/* min-w-0 matters: without it, a wide table would stretch this
          column and break the layout instead of scrolling inside it. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={nav.title}
          blurb={nav.blurb}
          onMenuClick={() => setNavOpen(true)}
          onAlertClick={() => goTo('emergency')}
        />

        {/* ---------- READ-ONLY NOTICE ----------
            One line, in ONE place, shown on every page for a role that
            cannot change records. Without it the missing New / Add buttons
            look like a bug rather than a permission.

            The wording says "switched off" rather than "hidden" because both
            things happen and the difference is deliberate: a button that only
            performs an action is removed, while a dropdown that also DISPLAYS
            a value is dimmed instead, so the value can still be read.

            It is also where we make the important exception clear: a
            read-only session can still report an emergency. The reason is
            in src/lib/roles.js — blocking that would be dangerous in a
            real system, so we do not model it here either. */}
        {!canManage && (
          <div className="readonly-strip">
            <Eye size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-[var(--green)]" />
            <span>
              <span className="text-hi">Read-only session.</span> The controls that change
              expedition, roster, cargo and stock records are switched off for this role — removed
              where they only act, dimmed where they also show a value. You can still report an
              emergency — raising the alarm is never blocked.
            </span>
          </div>
        )}

        {/* ---------- DATABASE NOTICE ----------
            One strip, two problems, and it knows which one happened:

              kind 'load' — the five tables could not be read, so the console
                            is running on its built-in demo data. Everything
                            works; nothing you change will be kept.
              kind 'save' — the tables were read fine, but a background write
                            failed. The change you just made is still on
                            screen and still correct in this tab, and it will
                            be gone after a refresh.

            NEITHER CAN APPEAR WITH NO DATABASE CONFIGURED, which is the
            default state of this project. Nothing is attempted, so nothing
            can fail, so this strip stays away during a demo on demo data.

            Why the 'save' case leaves the change on screen: the two
            alternatives are both dishonest. Doing nothing lets somebody walk
            away believing a record was filed. Silently undoing it makes a
            working button look broken. So the change stays and this says
            plainly what did not happen. Retry re-reads all five tables, which
            is the only route back to a state we can vouch for. */}
        {dbNotice && (
          <div className="sync-strip">
            <CloudOff size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-[var(--amber)]" />
            <span className="flex-1">
              {dbNotice.kind === 'save' ? (
                <>
                  <span className="text-hi">Not saved to the database.</span> {dbNotice.message} The
                  change is still on screen and still correct here, but it will be gone if you
                  refresh.
                </>
              ) : (
                <>
                  <span className="text-hi">Running on demo data.</span> {dbNotice.message} Every
                  module works normally; changes just will not survive a refresh.
                </>
              )}
            </span>
            <button type="button" onClick={reload} className="sync-strip__action">
              Retry
            </button>
            <button type="button" onClick={dismissDbNotice} className="sync-strip__action">
              Dismiss
            </button>
          </div>
        )}

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          {/* key={view} restarts the error boundary when you navigate, so
              one broken page does not stay broken forever. */}
          <ErrorBoundary key={view} onReset={() => goTo('dashboard')}>
            <div className="fade-up">{renderPage()}</div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

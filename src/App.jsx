/**
 * APP — the layout, and the thing that decides which page is on screen.
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
 * THE LAYOUT: sidebar on the left, top bar across, page content below.
 */

import { useState } from 'react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import ErrorBoundary from './components/ErrorBoundary'
import { findNavItem } from './lib/navigation'

import Dashboard from './pages/Dashboard'
import Expeditions from './pages/Expeditions'
import Personnel from './pages/Personnel'
import Cargo from './pages/Cargo'
import Inventory from './pages/Inventory'
import MapView from './pages/MapView'
import Weather from './pages/Weather'
import Emergency from './pages/Emergency'

export default function App() {
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

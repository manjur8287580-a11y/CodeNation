/**
 * THE SHARED DATA STORE  ("DataContext")
 * ======================================
 * THIS IS THE MOST IMPORTANT FILE IN THE PROJECT. Read this comment before
 * anything else — it is what makes the modules feel CONNECTED instead of
 * being six unrelated CRUD screens (master prompt section 12).
 *
 * THE IDEA, in one sentence:
 *   All the data lives in ONE place, and every page reads from that one
 *   place — so a change made on any page is instantly visible everywhere.
 *
 * WHY THAT MATTERS FOR THE DEMO:
 *   You report an emergency on the Emergency page.
 *     -> It is added to `emergencies` here.
 *     -> The Dashboard's "Critical Alerts" number is COUNTED from
 *        `emergencies`, so it goes up by itself.
 *     -> The Emergency list shows it, because it reads the same array.
 *   Nobody had to write code to "tell the dashboard to update". There is
 *   only one copy of the truth, so nothing can drift out of sync.
 *
 * THE ONE RULE THAT KEEPS IT HONEST:
 *   Numbers like "how many alerts" and "is this low stock" are never
 *   SAVED. They are always CALCULATED from the raw data (see `stats`
 *   below). A saved count can go stale. A calculated one cannot.
 *
 * "Context" is React's own built-in way of sharing data with every
 * component without passing it down by hand through every level. We are
 * using it instead of a library like Redux because it needs no extra
 * install and is far less to explain to a judge.
 */

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import demoData from '../data/demoData'
import { EMERGENCY_STATUS, EMERGENCY_TYPE, SEVERITY, isLowStock, statusLabel, stockStatus } from '../lib/statuses'
import { nextId } from '../lib/format'

/* The context object itself. Components never touch this directly —
   they call the useData() hook at the bottom of this file. */
const DataContext = createContext(null)

/* Where the data came from. Shown in the UI so we never mislead anyone
   about whether they are looking at a real database or demo data. */
export const DATA_SOURCE = {
  DEMO: 'DEMO',
  SUPABASE: 'SUPABASE',
}

export function DataProvider({ children }) {
  /* ---------- 1. THE RAW DATA ----------
     One useState per table. This mirrors the five database tables we
     will create in Supabase later, plus locations and the activity log. */
  const [locations, setLocations] = useState(demoData.locations)
  const [expeditions, setExpeditions] = useState(demoData.expeditions)
  const [personnel, setPersonnel] = useState(demoData.personnel)
  const [cargo, setCargo] = useState(demoData.cargo)
  const [inventory, setInventory] = useState(demoData.inventory)
  const [emergencies, setEmergencies] = useState(demoData.emergencies)
  const [activityLog, setActivityLog] = useState(demoData.activityLog)

  /* ---------- 2. LOADING / ERROR STATE ----------
     Master prompt section 15 asks every data operation to have a loading,
     error and empty state. These flags drive that. */
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [source, setSource] = useState(DATA_SOURCE.DEMO)

  /* Pretend to "load" briefly on first mount. This is not padding — it
     means the loading spinners are real code paths that we have actually
     seen work, so when Supabase is plugged in later nothing is new. */
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 350)
    return () => clearTimeout(timer)
  }, [])

  /* ---------- 3. ACTIVITY LOG ----------
     Every change records a line here, which is what makes the dashboard's
     "Recent Activity" panel look alive during a demo. */
  const logActivity = useCallback((kind, message) => {
    setActivityLog((prev) => [
      { id: `A-${Date.now()}`, at: new Date().toISOString(), kind, message },
      ...prev,
    ])
  }, [])

  /* ---------- 4. LOOKUP HELPERS ----------
     Small functions so pages don't repeat .find() everywhere. */
  const getExpedition = useCallback(
    (id) => expeditions.find((e) => e.id === id) || null,
    [expeditions]
  )
  const getLocation = useCallback((id) => locations.find((l) => l.id === id) || null, [locations])
  const getPerson = useCallback((id) => personnel.find((p) => p.id === id) || null, [personnel])

  /** Everyone assigned to one expedition. */
  const personnelForExpedition = useCallback(
    (expeditionId) => personnel.filter((p) => p.expedition_id === expeditionId),
    [personnel]
  )

  /** Every consignment belonging to one expedition. */
  const cargoForExpedition = useCallback(
    (expeditionId) => cargo.filter((c) => c.expedition_id === expeditionId),
    [cargo]
  )

  /* ============================================================
     5. ACTIONS — the only ways the data is allowed to change.
     ============================================================ */

  /* --- EXPEDITIONS --- */
  const addExpedition = useCallback(
    (fields) => {
      const record = {
        id: nextId(expeditions, 'EXP'),
        status: 'PLANNING',
        progress: 0,
        team_size: 0,
        created_at: new Date().toISOString(),
        ...fields,
      }
      setExpeditions((prev) => [...prev, record])
      logActivity('EXPEDITION', `${record.id} ${record.name} created`)
      return record
    },
    [expeditions, logActivity]
  )

  const updateExpedition = useCallback(
    (id, changes) => {
      setExpeditions((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes } : e)))
      if (changes.status) logActivity('EXPEDITION', `${id} status changed to ${changes.status}`)
      else logActivity('EXPEDITION', `${id} updated`)
    },
    [logActivity]
  )

  const deleteExpedition = useCallback(
    (id) => {
      setExpeditions((prev) => prev.filter((e) => e.id !== id))
      logActivity('EXPEDITION', `${id} removed`)
    },
    [logActivity]
  )

  /* --- PERSONNEL --- */
  const addPerson = useCallback(
    (fields) => {
      const record = {
        id: nextId(personnel, 'P'),
        status: 'ACTIVE',
        last_updated: new Date().toISOString(),
        ...fields,
      }
      setPersonnel((prev) => [...prev, record])
      logActivity('PERSONNEL', `${record.id} ${record.name} added to roster`)
      return record
    },
    [personnel, logActivity]
  )

  const updatePerson = useCallback(
    (id, changes) => {
      /* MOVING SOMEONE ALSO MOVES THEIR COORDINATES.
         If a page changes location_id without giving explicit lat/lng, we
         copy the coordinates from that location. That is why re-assigning
         someone on the Personnel page also moves their marker on the map —
         one edit, two modules updated, no extra code on either page. */
      let patch = changes
      if (changes.location_id && changes.latitude == null) {
        const place = locations.find((l) => l.id === changes.location_id)
        if (place) {
          patch = { ...changes, latitude: place.latitude, longitude: place.longitude }
        }
      }

      setPersonnel((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ...patch, last_updated: new Date().toISOString() } : p
        )
      )

      const person = personnel.find((p) => p.id === id)
      const who = `${id}${person ? ` ${person.name}` : ''}`

      if (changes.status) {
        logActivity('PERSONNEL', `${who} set to ${changes.status.replace('_', ' ')}`)
      } else if (changes.location_id) {
        const place = locations.find((l) => l.id === changes.location_id)
        logActivity('PERSONNEL', `${who} moved to ${place ? place.name : changes.location_id}`)
      }
    },
    [personnel, locations, logActivity]
  )

  /* --- CARGO --- */
  const addCargo = useCallback(
    (fields) => {
      const record = {
        id: nextId(cargo, 'C'),
        status: 'PLANNED',
        priority: 'MEDIUM',
        created_at: new Date().toISOString(),
        ...fields,
      }
      setCargo((prev) => [...prev, record])
      logActivity('CARGO', `${record.id} ${record.item_name} logged`)
      return record
    },
    [cargo, logActivity]
  )

  const updateCargo = useCallback(
    (id, changes) => {
      setCargo((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)))
      if (changes.status) {
        const item = cargo.find((c) => c.id === id)
        logActivity(
          'CARGO',
          `${id}${item ? ` ${item.item_name}` : ''} marked ${changes.status.replace('_', ' ')}`
        )
      }
    },
    [cargo, logActivity]
  )

  /* --- INVENTORY ---
     Note what happens when a quantity drops below its minimum: we do NOT
     set a "low stock" flag. stockStatus() recalculates it on every render,
     so the badge and the dashboard warning appear on their own. */
  const addInventoryItem = useCallback(
    (fields) => {
      const record = {
        id: nextId(inventory, 'I'),
        quantity: 0,
        minimum_quantity: 0,
        condition: 'GOOD',
        updated_at: new Date().toISOString(),
        ...fields,
      }
      setInventory((prev) => [...prev, record])
      logActivity('INVENTORY', `${record.item_name} added at ${record.location}`)
      return record
    },
    [inventory, logActivity]
  )

  const updateInventoryItem = useCallback(
    (id, changes) => {
      setInventory((prev) => {
        return prev.map((item) => {
          if (item.id !== id) return item

          const updated = { ...item, ...changes, updated_at: new Date().toISOString() }

          /* If this change is what pushed the item below its minimum,
             record that in the activity log. Comparing before/after means
             we log the crossing once, not on every later edit. */
          if (!isLowStock(item) && isLowStock(updated)) {
            logActivity(
              'INVENTORY',
              `${updated.item_name} fell below minimum at ${updated.location}`
            )
          }
          return updated
        })
      })
    },
    [logActivity]
  )

  /** Convenience used by the +/- buttons on the Inventory page. */
  const adjustInventoryQuantity = useCallback(
    (id, delta) => {
      const item = inventory.find((i) => i.id === id)
      if (!item) return
      const next = Math.max(0, (Number(item.quantity) || 0) + delta)
      updateInventoryItem(id, { quantity: next })
    },
    [inventory, updateInventoryItem]
  )

  /* --- EMERGENCIES ---
     This is the demo's centrepiece. Reporting an emergency also flips the
     affected person's status, which is the "modules are connected" moment
     you want the judges to notice. */
  const reportEmergency = useCallback(
    (fields) => {
      const record = {
        id: nextId(emergencies, 'INC'),
        status: 'ACTIVE',
        severity: 'HIGH',
        type: 'OTHER',
        reported_at: new Date().toISOString(),
        ...fields,
      }
      setEmergencies((prev) => [record, ...prev])

      /* Connected effect 1: the affected person goes to EMERGENCY status,
         which changes their badge on Personnel AND their marker on the map. */
      if (record.personnel_id) {
        setPersonnel((prev) =>
          prev.map((p) =>
            p.id === record.personnel_id
              ? { ...p, status: 'EMERGENCY', last_updated: new Date().toISOString() }
              : p
          )
        )
      }

      /* statusLabel() rather than the raw key, so the line reads "Weather
         Hazard" and not "WEATHER". Every type used to be a single word, so
         printing the key looked fine until the Weather module started
         filing incidents of type WEATHER — whose label is two words. */
      logActivity(
        'EMERGENCY',
        `${record.id} declared — ${statusLabel(EMERGENCY_TYPE, record.type)}, ${record.location} (${statusLabel(SEVERITY, record.severity)})`
      )
      return record
    },
    [emergencies, logActivity]
  )

  const updateEmergency = useCallback(
    (id, changes) => {
      setEmergencies((prev) =>
        prev.map((incident) => {
          if (incident.id !== id) return incident

          const updated = { ...incident, ...changes }
          if (changes.status === 'RESOLVED' && !updated.resolved_at) {
            updated.resolved_at = new Date().toISOString()
          }

          /* The same idea for the moment a team picked the incident up.
             "How long until somebody acknowledged it" is the number an
             emergency service is actually judged on, and it cannot be
             worked out afterwards from the record — it only exists if it
             is stamped here, at the moment it happens.

             The `!updated.acknowledged_at` guard means a second edit does
             not move the stamp. The first acknowledgement is the one that
             counts. */
          if (changes.status === 'RESPONDING' && !updated.acknowledged_at) {
            updated.acknowledged_at = new Date().toISOString()
          }

          /* Connected effect 2: resolving an incident releases the person
             back to ACTIVE, so the map marker turns from red to green. */
          if (changes.status === 'RESOLVED' && incident.personnel_id) {
            setPersonnel((prevPeople) =>
              prevPeople.map((p) =>
                p.id === incident.personnel_id && p.status === 'EMERGENCY'
                  ? { ...p, status: 'ACTIVE', last_updated: new Date().toISOString() }
                  : p
              )
            )
          }
          return updated
        })
      )
      if (changes.status) {
        /* statusLabel() for the same reason reportEmergency() uses it: the
           raw key would print "RESPONDING" in a log whose every other line
           is written in plain words. */
        logActivity(
          'EMERGENCY',
          `${id} status changed to ${statusLabel(EMERGENCY_STATUS, changes.status)}`
        )
      }
    },
    [logActivity]
  )

  /* ============================================================
     6. DERIVED STATISTICS — calculated, never stored.
        This object is what the Dashboard cards read.
     ============================================================ */
  const stats = useMemo(() => {
    const lowStockItems = inventory.filter(isLowStock)
    const outOfStockItems = inventory.filter((i) => stockStatus(i) === 'OUT_OF_STOCK')
    const activeEmergencies = emergencies.filter((e) => e.status === 'ACTIVE')
    const respondingEmergencies = emergencies.filter((e) => e.status === 'RESPONDING')
    const openEmergencies = emergencies.filter((e) => e.status !== 'RESOLVED')

    return {
      /* Expeditions */
      expeditionsTotal: expeditions.length,
      expeditionsActive: expeditions.filter((e) => e.status === 'ACTIVE').length,
      expeditionsPlanning: expeditions.filter((e) => e.status === 'PLANNING').length,

      /* Personnel — "deployed" means everyone not off duty. */
      personnelTotal: personnel.length,
      personnelDeployed: personnel.filter((p) => p.status !== 'OFF_DUTY').length,
      personnelInTransit: personnel.filter((p) => p.status === 'IN_TRANSIT').length,
      personnelEmergency: personnel.filter((p) => p.status === 'EMERGENCY').length,

      /* Cargo */
      cargoTotal: cargo.length,
      cargoInTransit: cargo.filter((c) => c.status === 'IN_TRANSIT').length,
      cargoDelayed: cargo.filter((c) => c.status === 'DELAYED').length,
      cargoArrived: cargo.filter((c) => c.status === 'ARRIVED').length,
      cargoCritical: cargo.filter((c) => c.priority === 'CRITICAL' && c.status !== 'ARRIVED')
        .length,

      /* Inventory */
      inventoryTotal: inventory.length,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      lowStockItems,
      inventoryLocations: new Set(inventory.map((i) => i.location)).size,

      /* Emergencies */
      emergenciesActive: activeEmergencies.length,
      emergenciesResponding: respondingEmergencies.length,
      emergenciesOpen: openEmergencies.length,
      activeEmergencies,
      openEmergencies,

      /* The single "Critical Alerts" number on the dashboard:
         open incidents + items that have run out entirely. */
      criticalAlerts: openEmergencies.length + outOfStockItems.length,
    }
  }, [expeditions, personnel, cargo, inventory, emergencies])

  /* ---------- 7. HAND EVERYTHING TO THE APP ---------- */
  const value = useMemo(
    () => ({
      /* raw data */
      locations,
      expeditions,
      personnel,
      cargo,
      inventory,
      emergencies,
      activityLog,

      /* status of the data itself */
      loading,
      error,
      source,
      setError,
      setSource,

      /* calculated numbers */
      stats,

      /* lookups */
      getExpedition,
      getLocation,
      getPerson,
      personnelForExpedition,
      cargoForExpedition,

      /* actions */
      addExpedition,
      updateExpedition,
      deleteExpedition,
      addPerson,
      updatePerson,
      addCargo,
      updateCargo,
      addInventoryItem,
      updateInventoryItem,
      adjustInventoryQuantity,
      reportEmergency,
      updateEmergency,
      logActivity,
    }),
    [
      locations,
      expeditions,
      personnel,
      cargo,
      inventory,
      emergencies,
      activityLog,
      loading,
      error,
      source,
      stats,
      getExpedition,
      getLocation,
      getPerson,
      personnelForExpedition,
      cargoForExpedition,
      addExpedition,
      updateExpedition,
      deleteExpedition,
      addPerson,
      updatePerson,
      addCargo,
      updateCargo,
      addInventoryItem,
      updateInventoryItem,
      adjustInventoryQuantity,
      reportEmergency,
      updateEmergency,
      logActivity,
    ]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

/**
 * THE HOOK EVERY PAGE USES.
 *
 * In any component, write:
 *     const { expeditions, stats } = useData()
 *
 * and you have the shared data. That is the whole API.
 */
export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData() must be used inside <DataProvider>. Check src/main.jsx.')
  }
  return context
}

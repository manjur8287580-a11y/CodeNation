/**
 * STATUS VOCABULARY
 * =================
 * Every status word used anywhere in the app is defined ONCE, here.
 *
 * Why bother? Because if "IN_TRANSIT" is typed by hand in six different
 * files, one typo silently breaks a filter or a count. Importing from one
 * file means a typo becomes an immediate, obvious error instead.
 *
 * Each status has three things:
 *   - the KEY   ("IN_TRANSIT")  used in data and comparisons
 *   - the LABEL ("In Transit")  shown to the user
 *   - the TONE  ("info")        which colour the badge uses
 */

/* ---------- EXPEDITIONS ---------- */
export const EXPEDITION_STATUS = {
  PLANNING: { label: 'Planning', tone: 'info' },
  ACTIVE: { label: 'Active', tone: 'ok' },
  COMPLETED: { label: 'Completed', tone: 'muted' },
  SUSPENDED: { label: 'Suspended', tone: 'warn' },
}

/* ---------- PERSONNEL ---------- */
export const PERSONNEL_STATUS = {
  ACTIVE: { label: 'Active', tone: 'ok' },
  IN_TRANSIT: { label: 'In Transit', tone: 'info' },
  RESTING: { label: 'Resting', tone: 'blue' },
  EMERGENCY: { label: 'Emergency', tone: 'critical' },
  OFF_DUTY: { label: 'Off Duty', tone: 'muted' },
}

/* ---------- CARGO ---------- */
export const CARGO_STATUS = {
  PLANNED: { label: 'Planned', tone: 'muted' },
  LOADED: { label: 'Loaded', tone: 'blue' },
  IN_TRANSIT: { label: 'In Transit', tone: 'info' },
  ARRIVED: { label: 'Arrived', tone: 'ok' },
  DELAYED: { label: 'Delayed', tone: 'alert' },
}

export const PRIORITY = {
  LOW: { label: 'Low', tone: 'muted' },
  MEDIUM: { label: 'Medium', tone: 'blue' },
  HIGH: { label: 'High', tone: 'warn' },
  CRITICAL: { label: 'Critical', tone: 'critical' },
}

/* ---------- INVENTORY ---------- */
// Stock status is never stored in the data. It is always CALCULATED from
// quantity vs minimum_quantity — see stockStatus() below. That guarantees
// the badge can never disagree with the numbers next to it.
export const STOCK_STATUS = {
  AVAILABLE: { label: 'Available', tone: 'ok' },
  LOW_STOCK: { label: 'Low Stock', tone: 'alert' },
  OUT_OF_STOCK: { label: 'Out of Stock', tone: 'critical' },
}

export const CONDITION = {
  NEW: { label: 'New', tone: 'ok' },
  GOOD: { label: 'Good', tone: 'ok' },
  SERVICEABLE: { label: 'Serviceable', tone: 'warn' },
  NEEDS_REPAIR: { label: 'Needs Repair', tone: 'alert' },
  EXPIRED: { label: 'Expired', tone: 'critical' },
}

/* ---------- EMERGENCIES ---------- */
export const EMERGENCY_STATUS = {
  ACTIVE: { label: 'Active', tone: 'critical' },
  RESPONDING: { label: 'Responding', tone: 'warn' },
  RESOLVED: { label: 'Resolved', tone: 'ok' },
}

export const EMERGENCY_TYPE = {
  MEDICAL: { label: 'Medical' },
  EQUIPMENT_FAILURE: { label: 'Equipment Failure' },
  WEATHER: { label: 'Weather Hazard' },
  OVERDUE_CHECKIN: { label: 'Overdue Check-in' },
  FIRE: { label: 'Fire' },
  VEHICLE: { label: 'Vehicle Incident' },
  OTHER: { label: 'Other' },
}

export const SEVERITY = {
  LOW: { label: 'Low', tone: 'muted' },
  MEDIUM: { label: 'Medium', tone: 'blue' },
  HIGH: { label: 'High', tone: 'alert' },
  CRITICAL: { label: 'Critical', tone: 'critical' },
}

/* ---------- LOCATION TYPES (used by the map) ---------- */
export const LOCATION_TYPE = {
  STATION: { label: 'Research Station', tone: 'info' },
  CAMP: { label: 'Field Camp', tone: 'blue' },
  VESSEL: { label: 'Vessel', tone: 'violet' },
  RUNWAY: { label: 'Air Link', tone: 'warn' },
  PORT: { label: 'Staging Port', tone: 'muted' },
  DEPOT: { label: 'Depot', tone: 'muted' },
  HQ: { label: 'Headquarters', tone: 'ok' },
}

/* ============================================================
   HELPERS
   ============================================================ */

/**
 * Turns a status KEY into its display label.
 * Falls back to a readable version of the key if it isn't in the map,
 * so an unexpected value shows "Some Thing" rather than crashing.
 */
export function statusLabel(map, key) {
  if (map[key]?.label) return map[key].label
  if (!key) return '—'
  return String(key)
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Turns a status KEY into its badge colour tone. */
export function statusTone(map, key) {
  return map[key]?.tone || 'muted'
}

/**
 * THE LOW-STOCK RULE (master prompt section 5).
 *
 *   quantity === 0            -> OUT_OF_STOCK
 *   quantity <= minimum       -> LOW_STOCK
 *   otherwise                 -> AVAILABLE
 *
 * This is a plain function, not stored data, so it can never go stale.
 */
export function stockStatus(item) {
  const qty = Number(item?.quantity) || 0
  const min = Number(item?.minimum_quantity) || 0
  if (qty === 0) return 'OUT_OF_STOCK'
  if (qty <= min) return 'LOW_STOCK'
  return 'AVAILABLE'
}

/** True when an inventory item needs attention (low or out of stock). */
export function isLowStock(item) {
  return stockStatus(item) !== 'AVAILABLE'
}

/** Builds a <select> friendly list: [{ value, label }, ...] */
export function optionsFrom(map) {
  return Object.entries(map).map(([value, meta]) => ({ value, label: meta.label }))
}

/* ============================================================
   TONE -> COLOUR, FOR CHARTS ONLY
   ============================================================
   Everywhere else in the app, a tone becomes a colour through CSS:
   `tone: 'alert'` renders <span class="badge badge--alert">, and
   src/index.css decides what orange means.

   Charts cannot do that. Recharts draws real SVG shapes, and an SVG
   `fill` cannot read a CSS variable — fill="var(--orange)" simply does
   not paint. So a chart needs the colour written out.

   These eight values are THE SAME COLOURS as the variables in
   src/index.css, copied here as plain text. The comment on each line
   names the variable it mirrors. If you ever change a colour in
   index.css, change it here too, otherwise a bar and the badge next to
   it will disagree — which on this app would be a real bug, because the
   whole point is that the charts and the badges are the same facts.
   ============================================================ */
export const TONE_COLOUR = {
  ok: '#4fc98a' /* --green   */,
  info: '#6fd6d6' /* --ice     */,
  blue: '#5aa9ff' /* --blue    */,
  warn: '#e8b84b' /* --amber   */,
  alert: '#ff6a3d' /* --orange  */,
  critical: '#ff5a5a' /* --red     */,
  violet: '#a98bff' /* --violet  */,
  muted: '#a5bdc7' /* --ink-mid */,
}

/**
 * The chart colour for one status key.
 *   statusColour(CARGO_STATUS, 'DELAYED')   -> '#ff6a3d'
 *   statusColour(STOCK_STATUS, 'AVAILABLE') -> '#4fc98a'
 *
 * Because it reads the very same tone the badge reads, a bar is always
 * the colour of its badge. Nothing is chosen twice.
 */
export function statusColour(map, key) {
  return TONE_COLOUR[statusTone(map, key)] || TONE_COLOUR.muted
}

/**
 * MAP INTEGRATION — Leaflet + OpenStreetMap
 * =========================================
 * A single situational-awareness view: every site, every person and every
 * open incident on one chart, all read from the SAME shared store the rest
 * of the console uses (src/store/DataContext.jsx).
 *
 * THAT IS THE POINT. This page owns no data of its own. So:
 *   - change someone's duty status on the Personnel page  -> their dot
 *     changes colour here
 *   - move someone to another station                     -> their dot moves
 *   - report an emergency on the Emergency page           -> a red ring
 *     appears here AND the person involved turns red
 * None of that needed a single line of "tell the map to update" code.
 *
 * HONESTY, WHICH MATTERS MORE THAN THE FEATURE (see the footer too):
 *   The three station coordinates are REAL — Maitri, Bharati and Himadri
 *   are India's actual polar stations and those are their published
 *   positions. Everything that MOVES on this map is SIMULATED demo data.
 *   There is no GPS receiver, no satellite tracker and no NCPOR feed
 *   behind any of it. Say exactly that if a judge asks.
 *
 * TWO LEAFLET THINGS WORTH KNOWING IF YOU EDIT THIS FILE:
 *   1. Leaflet is not a React library — it draws straight onto a DOM node.
 *      So we create the map inside useEffect, keep it in a ref, and tear
 *      it down in the cleanup function. Without that teardown React's
 *      StrictMode (which mounts every component twice in development)
 *      leaves you with two maps stacked on top of each other.
 *   2. Markers are plain HTML (L.divIcon) styled in src/index.css, not
 *      Leaflet's default blue pin. The default pin loads a PNG by
 *      relative path, which bundlers like Vite break — and our own
 *      shapes look far more like an operations console anyway.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  AlertTriangle,
  Crosshair,
  Layers,
  MapPin,
  Radio,
  Users,
} from 'lucide-react'

import Panel from '../components/Panel'
import Badge from '../components/Badge'
import StateBlock from '../components/StateBlock'
import { useData } from '../store/DataContext'
import {
  EMERGENCY_STATUS,
  EMERGENCY_TYPE,
  LOCATION_TYPE,
  PERSONNEL_STATUS,
  SEVERITY,
  statusLabel,
} from '../lib/statuses'
import { formatCoords, timeAgo } from '../lib/format'

/* ============================================================
   CONSTANTS
   ============================================================ */

/* Free OpenStreetMap tiles. No API key, no account, no billing.
   The attribution below is not optional — OSM's usage policy requires
   it to stay visible, and it is rendered in the bottom-right corner. */
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/* Marker colours. These are CSS variables from src/index.css rather than
   hex codes, so the map automatically matches the rest of the palette —
   and each one deliberately mirrors the badge tone in src/lib/statuses.js,
   which is why the legend swatches match the badges elsewhere. */
const SITE_COLOUR = {
  STATION: 'var(--ice)',
  CAMP: 'var(--blue)',
  VESSEL: 'var(--violet)',
  RUNWAY: 'var(--amber)',
  PORT: 'var(--ink-mid)',
  DEPOT: 'var(--ink-mid)',
  HQ: 'var(--green)',
}

const PERSON_COLOUR = {
  ACTIVE: 'var(--green)',
  IN_TRANSIT: 'var(--ice)',
  RESTING: 'var(--blue)',
  EMERGENCY: 'var(--red)',
  OFF_DUTY: 'var(--ink-low)',
}

/* The camera presets. These only move the VIEW — every marker stays on
   the map whichever one you pick. */
const REGIONS = [
  { key: 'ALL', label: 'All theatres' },
  { key: 'ANTARCTIC', label: 'Antarctic' },
  { key: 'ARCTIC', label: 'Arctic' },
  { key: 'SUPPORT', label: 'Transit & support' },
]

/** Which theatre a latitude belongs to. Deliberately crude — it only
    decides where the camera flies, never what the data says. */
function regionOf(lat) {
  if (lat <= -55) return 'ANTARCTIC'
  if (lat >= 60) return 'ARCTIC'
  return 'SUPPORT'
}

/** Guards against a bad coordinate silently drawing a marker at 0,0. */
function hasCoords(x) {
  return Number.isFinite(Number(x?.latitude)) && Number.isFinite(Number(x?.longitude))
}

/**
 * WHY PERSONNEL MARKERS ARE FANNED OUT
 * ------------------------------------
 * In the demo data everyone stationed at Maitri shares Maitri's exact
 * coordinates. Drawn literally, eight people stack into one dot and the
 * map looks empty. So members of a shared position are spread around it
 * in a small ring roughly 2 km across, purely so they can be seen and
 * clicked.
 *
 * This does not invent tracking data. Those coordinates were already
 * simulated (read the header of src/data/demoData.js), the ring is
 * derived from each person's position in the list so it never jumps
 * about between renders, and the legend on this page says plainly that
 * personnel positions are simulated.
 */
function spreadPositions(people) {
  const groups = new Map()
  people.forEach((person) => {
    const key = `${person.latitude},${person.longitude}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(person)
  })

  const positions = new Map()
  groups.forEach((members) => {
    members.forEach((person, index) => {
      const lat = Number(person.latitude)
      const lng = Number(person.longitude)

      if (members.length === 1) {
        positions.set(person.id, [lat, lng])
        return
      }

      const angle = (index / members.length) * Math.PI * 2
      const radius = 0.018

      /* Close to the poles a degree of longitude covers far less ground
         than a degree of latitude, so the longitude offset is widened to
         keep the ring looking round instead of squashed. */
      const lngScale = 1 / Math.max(0.15, Math.cos((lat * Math.PI) / 180))

      positions.set(person.id, [
        lat + Math.cos(angle) * radius,
        lng + Math.sin(angle) * radius * lngScale,
      ])
    })
  })

  return positions
}

/** Builds one of our HTML markers. `colour` and `shape` are always
    values from the constants above — never anything typed by a user. */
function pinIcon(shape, colour, size, isSelected) {
  return L.divIcon({
    /* An empty className stops Leaflet adding its own .leaflet-div-icon,
       which would draw a white box behind our shape. */
    className: '',
    html: `<div class="map-pin map-pin--${shape}${isSelected ? ' map-pin--selected' : ''}"${
      colour ? ` style="background:${colour}"` : ''
    }></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/** Leaflet accepts a DOM node for tooltips. Using textContent rather than
    an HTML string means a record's text can never be treated as markup. */
function textTooltip(text) {
  const node = document.createElement('span')
  node.textContent = text
  return node
}

/* ============================================================
   THE PAGE
   ============================================================ */

export default function MapView({ goTo }) {
  const {
    locations,
    personnel,
    emergencies,
    loading,
    error,
    getPerson,
    getLocation,
    getExpedition,
  } = useData()

  /* Which camera preset is active. */
  const [region, setRegion] = useState('ALL')

  /* Which marker layers are switched on. */
  const [show, setShow] = useState({ sites: true, people: true, incidents: true })

  /* What is open in the detail panel: { kind: 'site'|'person'|'incident', id }. */
  const [selected, setSelected] = useState(null)

  /* Set to true once the Leaflet map exists, so the marker-drawing effect
     below knows it is safe to run. */
  const [mapReady, setMapReady] = useState(false)

  const containerRef = useRef(null)
  const mapRef = useRef(null)

  /* ---------- WHAT GOES ON THE MAP ---------- */
  const sites = useMemo(() => locations.filter(hasCoords), [locations])
  const people = useMemo(() => personnel.filter(hasCoords), [personnel])
  const openIncidents = useMemo(
    () => emergencies.filter((e) => e.status !== 'RESOLVED' && hasCoords(e)),
    [emergencies]
  )
  const personPositions = useMemo(() => spreadPositions(people), [people])

  /* ---------- EFFECT 1: CREATE THE MAP (once) ---------- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined

    const map = L.map(containerRef.current, {
      center: [-25, 30],
      zoom: 2,
      /* minZoom 1, not 2: our assets run from Goa to Antarctica, and at
         zoom 2 the whole world is taller than the panel — the "All
         theatres" view would be permanently cropped. */
      minZoom: 1,
      worldCopyJump: true,
    })

    L.tileLayer(TILE_URL, {
      className: 'map-tiles',
      attribution: TILE_ATTRIBUTION,
      maxZoom: 18,
    }).addTo(map)

    mapRef.current = map
    setMapReady(true)

    /* Leaflet measures its container the moment the map is created. If the
       surrounding layout settles a frame later the map can be left holding
       the wrong size and draw grey gaps, so we nudge it once. */
    const nudge = setTimeout(() => map.invalidateSize(), 0)

    return () => {
      clearTimeout(nudge)
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [])

  /* ---------- EFFECT 2: DRAW THE MARKERS ----------
     Runs again whenever the data changes, a layer is toggled, or the
     selection moves. Redrawing all of them is deliberate: it is only a
     few dozen markers, and "throw them away and draw the current truth"
     is far easier to reason about than patching individual markers. */
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return undefined

    const layer = L.layerGroup().addTo(map)

    /* --- sites --- */
    if (show.sites) {
      sites.forEach((site) => {
        const isSelected = selected?.kind === 'site' && selected.id === site.id
        const marker = L.marker([Number(site.latitude), Number(site.longitude)], {
          icon: pinIcon('site', SITE_COLOUR[site.type] || 'var(--ink-mid)', 12, isSelected),
        })
        marker.bindTooltip(
          textTooltip(`${site.name} · ${statusLabel(LOCATION_TYPE, site.type)}`),
          { direction: 'top', offset: [0, -8] }
        )
        marker.on('click', () => setSelected({ kind: 'site', id: site.id }))
        marker.addTo(layer)
      })
    }

    /* --- personnel ---
       Anyone in EMERGENCY status is drawn last and lifted above the rest,
       so a casualty is never hidden underneath a colleague's dot. */
    if (show.people) {
      const ordered = [...people].sort(
        (a, b) => (a.status === 'EMERGENCY' ? 1 : 0) - (b.status === 'EMERGENCY' ? 1 : 0)
      )

      ordered.forEach((person) => {
        const position = personPositions.get(person.id)
        if (!position) return

        const isSelected = selected?.kind === 'person' && selected.id === person.id
        const marker = L.marker(position, {
          icon: pinIcon('person', PERSON_COLOUR[person.status] || 'var(--ink-low)', 9, isSelected),
          zIndexOffset: person.status === 'EMERGENCY' ? 500 : 0,
        })
        marker.bindTooltip(
          textTooltip(`${person.name} · ${statusLabel(PERSONNEL_STATUS, person.status)}`),
          { direction: 'top', offset: [0, -7] }
        )
        marker.on('click', () => setSelected({ kind: 'person', id: person.id }))
        marker.addTo(layer)
      })
    }

    /* --- open incidents (drawn on top of everything) --- */
    if (show.incidents) {
      openIncidents.forEach((incident) => {
        const isSelected = selected?.kind === 'incident' && selected.id === incident.id
        const marker = L.marker([Number(incident.latitude), Number(incident.longitude)], {
          icon: pinIcon('incident', null, 20, isSelected),
          zIndexOffset: 1000,
        })
        marker.bindTooltip(
          textTooltip(`${incident.id} · ${statusLabel(EMERGENCY_TYPE, incident.type)}`),
          { direction: 'top', offset: [0, -12] }
        )
        marker.on('click', () => setSelected({ kind: 'incident', id: incident.id }))
        marker.addTo(layer)
      })
    }

    return () => {
      layer.remove()
    }
  }, [mapReady, sites, people, openIncidents, personPositions, show, selected])

  /* ---------- EFFECT 3: MOVE THE CAMERA WHEN THE THEATRE CHANGES ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    /* Build the list of points the camera should cover, from the real
       data rather than hardcoded coordinates — so adding a station to
       demoData.js automatically widens the view. */
    const points = []
    const collect = (lat, lng) => {
      if (region === 'ALL' || regionOf(lat) === region) points.push([lat, lng])
    }

    if (show.sites) sites.forEach((s) => collect(Number(s.latitude), Number(s.longitude)))
    if (show.people) people.forEach((p) => collect(Number(p.latitude), Number(p.longitude)))
    if (show.incidents) {
      openIncidents.forEach((e) => collect(Number(e.latitude), Number(e.longitude)))
    }

    if (!points.length) return

    /* Leaflet works out the zoom from how big it THINKS the container is.
       If the surrounding layout settled after the map was created, that
       guess is stale and the view ends up cropped — so we make it
       re-measure before fitting. */
    map.invalidateSize()

    /* Padding is in PIXELS, not degrees. Degree-based padding (.pad())
       looks fine over one station but pushes past the poles once the
       bounds span Goa to Antarctica, which makes the fit impossible.

       animate:false is deliberate, and it took a while to find. An
       animated fit slides the map with a CSS transition, and Leaflet only
       finishes the move when that transition reports back. Redrawing the
       markers straight afterwards cancels the transition, so the report
       never arrives: the map is left parked half way while Leaflet
       believes it has arrived, and every marker is drawn a few hundred
       pixels off. Switching theatre now cuts straight to the new view,
       which is also easier to follow across a 150-degree jump. */
    map.fitBounds(L.latLngBounds(points), {
      padding: [26, 26],
      maxZoom: 9,
      animate: false,
    })
  }, [mapReady, region, sites, people, openIncidents, show])

  /* ---------- CLICKING A LIST ENTRY MOVES THE CHART THERE ---------- */
  const focusOn = (kind, id, lat, lng) => {
    setSelected({ kind, id })
    const map = mapRef.current
    if (map && Number.isFinite(lat) && Number.isFinite(lng)) {
      /* setView, not flyTo, for the same reason the theatre fit above is
         not animated: selecting a record re-renders this page, and the
         re-render interrupts Leaflet's glide part-way through, which left
         the chart frozen at the wrong place. An instant move always
         lands. Zoom 7 is close enough to separate people at one station. */
      map.setView([lat, lng], Math.max(map.getZoom(), 7), { animate: false })
    }
  }

  /* ---------- THE DETAIL PANEL CONTENTS ----------
     Every marker type is turned into the same simple shape — a title, a
     badge, some key/value rows — so the panel is written once instead of
     three times. */
  const detail = useMemo(() => {
    if (!selected) return null

    if (selected.kind === 'site') {
      const site = locations.find((l) => l.id === selected.id)
      if (!site) return null

      const here = personnel.filter((p) => p.location_id === site.id)
      return {
        kind: 'Site',
        title: site.name,
        badge: <Badge map={LOCATION_TYPE} value={site.type} />,
        coords: formatCoords(site.latitude, site.longitude),
        rows: [
          { label: 'Region', value: site.region },
          { label: 'Personnel here', value: `${here.length}` },
          ...(site.capacity ? [{ label: 'Capacity', value: `${site.capacity}` }] : []),
        ],
        note: site.notes,
        /* Real published positions for the stations; the vessels are not. */
        positionIsReal: site.type !== 'VESSEL',
        action: here.length > 0 && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => goTo('personnel')}>
            <Users size={13} /> View {here.length} on Personnel
          </button>
        ),
      }
    }

    if (selected.kind === 'person') {
      const person = getPerson(selected.id)
      if (!person) return null

      const place = getLocation(person.location_id)
      const expedition = getExpedition(person.expedition_id)
      return {
        kind: 'Personnel',
        title: person.name,
        badge: <Badge map={PERSONNEL_STATUS} value={person.status} dot />,
        coords: formatCoords(person.latitude, person.longitude),
        rows: [
          { label: 'Role', value: person.role },
          { label: 'Assigned to', value: expedition ? expedition.name : '—' },
          { label: 'Stationed at', value: place ? place.name : '—' },
          { label: 'Last update', value: timeAgo(person.last_updated) },
        ],
        positionIsReal: false,
        action: (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => goTo('personnel')}>
            <Users size={13} /> Open Personnel
          </button>
        ),
      }
    }

    const incident = emergencies.find((e) => e.id === selected.id)
    if (!incident) return null

    const casualty = incident.personnel_id ? getPerson(incident.personnel_id) : null
    return {
      kind: 'Incident',
      title: statusLabel(EMERGENCY_TYPE, incident.type),
      badge: <Badge map={EMERGENCY_STATUS} value={incident.status} dot />,
      coords: formatCoords(incident.latitude, incident.longitude),
      rows: [
        { label: 'Reference', value: incident.id },
        { label: 'Severity', value: statusLabel(SEVERITY, incident.severity) },
        { label: 'Reported', value: timeAgo(incident.reported_at) },
        { label: 'Location', value: incident.location },
        ...(casualty ? [{ label: 'Person involved', value: casualty.name }] : []),
        ...(incident.assigned_team ? [{ label: 'Responding', value: incident.assigned_team }] : []),
      ],
      note: incident.description,
      positionIsReal: false,
      action: (
        <button type="button" className="btn btn--alert btn--sm" onClick={() => goTo('emergency')}>
          <AlertTriangle size={13} /> Open Emergency
        </button>
      ),
    }
  }, [selected, locations, personnel, emergencies, getPerson, getLocation, getExpedition, goTo])

  /* ---------- NUMBERS FOR THE SUMMARY STRIP ---------- */
  const peopleAtEmergency = people.filter((p) => p.status === 'EMERGENCY').length

  /* Personnel count per site, used by the deployment list. */
  const deployment = sites
    .map((site) => ({
      site,
      count: personnel.filter((p) => p.location_id === site.id).length,
      emergency: personnel.filter((p) => p.location_id === site.id && p.status === 'EMERGENCY')
        .length,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)

  const toggleLayer = (key) => setShow((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="space-y-4">
      {/* ================= SUMMARY STRIP ================= */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Sites plotted', value: sites.length },
          { label: 'Personnel plotted', value: people.length },
          { label: 'Open incidents', value: openIncidents.length, tone: openIncidents.length ? 'alert' : undefined },
          { label: 'People in emergency', value: peopleAtEmergency, tone: peopleAtEmergency ? 'alert' : undefined },
        ].map((item) => (
          <div key={item.label} className="card-tight">
            <div className="eyebrow">{item.label}</div>
            <div className={`stat-value mt-1 ${item.tone ? `stat-value--${item.tone}` : ''}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* If the store ever fails to load, say so — and still show the map. */}
      {error && (
        <StateBlock
          kind="error"
          title="Some records could not be loaded"
          message={String(error)}
        />
      )}

      {/* ================= MAP + DETAIL ================= */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          eyebrow="Situation"
          title="Live Operations Chart"
          subtitle="OpenStreetMap base layer · click any marker for its record"
        >
          {/* Theatre buttons sit on their own row rather than up in the
              panel heading. On a phone the heading is not wide enough for
              the title and four buttons, and the last one was being cut
              off the edge of the screen. Down here they get the full
              width of the panel and wrap onto a second line if needed. */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {REGIONS.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`btn btn--sm ${region === r.key ? '' : 'btn--ghost'}`}
                onClick={() => setRegion(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Layer switches. Plain checkboxes — nothing clever needed. */}
          <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="flex items-center gap-1.5 text-[11px] text-low">
              <Layers size={13} /> Layers
            </span>
            {[
              { key: 'sites', label: `Sites (${sites.length})` },
              { key: 'people', label: `Personnel (${people.length})` },
              { key: 'incidents', label: `Open incidents (${openIncidents.length})` },
            ].map((layer) => (
              <label
                key={layer.key}
                className="flex cursor-pointer items-center gap-2 text-[12px] text-mid"
              >
                <input
                  type="checkbox"
                  checked={show[layer.key]}
                  onChange={() => toggleLayer(layer.key)}
                  className="accent-[var(--ice)]"
                />
                {layer.label}
              </label>
            ))}
          </div>

          {/* THE MAP ITSELF.
              The container needs a real height before Leaflet can draw
              into it — a height of zero is the usual reason a Leaflet map
              comes out blank grey. */}
          <div className="map-shell h-[420px] lg:h-[560px]">
            <div ref={containerRef} className="h-full w-full" />

            {loading && (
              <div className="absolute inset-0 z-[500] grid place-items-center bg-[rgba(8,17,26,0.72)]">
                <StateBlock kind="loading" title="Plotting assets…" message="Reading the roster." />
              </div>
            )}
          </div>
        </Panel>

        {/* ---------- RIGHT COLUMN: detail + legend ---------- */}
        <div className="space-y-4">
          <Panel
            eyebrow={detail ? detail.kind : 'Selection'}
            title={detail ? detail.title : 'Nothing selected'}
            subtitle={detail ? detail.coords : 'Click a marker on the chart'}
            action={detail?.badge}
          >
            {!detail ? (
              <div className="state-block">
                <Crosshair size={20} strokeWidth={1.75} className="mx-auto mb-2 text-[var(--ink-low)]" />
                <strong>No marker selected</strong>
                <span>
                  Click a square for a site, a dot for a person, or a red ring for an open
                  incident.
                </span>
              </div>
            ) : (
              <>
                <dl className="mb-3">
                  {detail.rows.map((row) => (
                    <div key={row.label} className="kv">
                      <dt>{row.label}</dt>
                      <dd className="truncate">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                {detail.note && (
                  <p className="mb-3 text-[12px] leading-relaxed text-mid">{detail.note}</p>
                )}

                <p className="mb-3 text-[11px] leading-relaxed text-low">
                  {detail.positionIsReal
                    ? 'Position: real published coordinates for this site.'
                    : 'Position: simulated for this prototype — not a live tracker reading.'}
                </p>

                {detail.action}
              </>
            )}
          </Panel>

          {/* ---------- LEGEND ---------- */}
          <Panel eyebrow="Key" title="Legend" tight>
            <div className="mb-3">
              <div className="mb-1.5 text-[11px] text-low">Sites — square</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {Object.entries(LOCATION_TYPE).map(([key, meta]) => (
                  <span key={key} className="flex items-center gap-1.5 text-[11.5px] text-mid">
                    <i
                      className="legend-swatch"
                      style={{ background: SITE_COLOUR[key], borderRadius: 2 }}
                    />
                    {meta.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="mb-1.5 text-[11px] text-low">Personnel — dot</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {Object.entries(PERSONNEL_STATUS).map(([key, meta]) => (
                  <span key={key} className="flex items-center gap-1.5 text-[11.5px] text-mid">
                    <i
                      className="legend-swatch"
                      style={{ background: PERSON_COLOUR[key], borderRadius: '50%' }}
                    />
                    {meta.label}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[11px] text-low">Incidents — pulsing ring</div>
              <span className="flex items-center gap-1.5 text-[11.5px] text-mid">
                <i
                  className="legend-swatch"
                  style={{
                    background: 'rgba(255,90,90,0.28)',
                    borderColor: 'var(--red)',
                    borderRadius: '50%',
                  }}
                />
                Open emergency
              </span>
            </div>
          </Panel>
        </div>
      </div>

      {/* ================= LISTS UNDER THE MAP ================= */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          eyebrow="Deployment"
          title="Personnel by Site"
          subtitle="Click a site to centre the chart on it"
        >
          {deployment.length === 0 ? (
            <StateBlock kind="empty" title="Nobody is deployed" message="The roster is empty." />
          ) : (
            <ul className="space-y-1">
              {deployment.map(({ site, count, emergency }) => (
                <li key={site.id}>
                  <button
                    type="button"
                    className="card-interactive flex w-full items-center gap-3 rounded-[3px] px-2 py-2 text-left"
                    onClick={() =>
                      focusOn('site', site.id, Number(site.latitude), Number(site.longitude))
                    }
                  >
                    <i
                      className="legend-swatch"
                      style={{ background: SITE_COLOUR[site.type], borderRadius: 2 }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-hi">{site.name}</span>
                      <span className="block truncate text-[11px] text-low">{site.region}</span>
                    </span>
                    {emergency > 0 && (
                      <Badge tone="critical" label={`${emergency} emergency`} />
                    )}
                    <span className="mono shrink-0 text-[12px] text-mid">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          eyebrow="Incidents"
          title="Open Incidents on the Chart"
          subtitle={
            openIncidents.length
              ? 'Click one to centre the chart on it'
              : 'Nothing open — the chart is clear'
          }
          action={
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => goTo('emergency')}>
              <Radio size={13} /> Emergency console
            </button>
          }
        >
          {openIncidents.length === 0 ? (
            <StateBlock
              kind="empty"
              title="No open incidents"
              message="Nothing is currently being responded to."
            />
          ) : (
            <ul className="space-y-1">
              {openIncidents.map((incident) => (
                <li key={incident.id}>
                  <button
                    type="button"
                    className="card-interactive flex w-full items-start gap-3 rounded-[3px] px-2 py-2 text-left"
                    onClick={() =>
                      focusOn(
                        'incident',
                        incident.id,
                        Number(incident.latitude),
                        Number(incident.longitude)
                      )
                    }
                  >
                    <MapPin size={14} className="mt-0.5 shrink-0 text-[var(--red)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-hi">
                        {statusLabel(EMERGENCY_TYPE, incident.type)} — {incident.location}
                      </span>
                      <span className="mono block truncate text-[11px] text-low">
                        {incident.id} · {timeAgo(incident.reported_at)}
                      </span>
                    </span>
                    <Badge map={EMERGENCY_STATUS} value={incident.status} dot />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ================= HONEST FOOTER ================= */}
      <div className="alert-strip alert-strip--warn">
        <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--amber)]" />
        <div className="text-[12px] leading-relaxed text-mid">
          <strong className="text-hi">Simulated positions.</strong> The base map and the three
          station coordinates are real — Maitri, Bharati and Himadri are India&apos;s actual polar
          stations at their published positions. <em>Everything that moves is simulated.</em> This
          prototype has <em>no</em> GPS receiver, satellite tracker or NCPOR data feed: personnel,
          vessel and incident positions are demo values that only change when someone changes them
          in this console. Personnel sharing a station are fanned out into a small ring so they can
          each be seen and clicked — that spacing is a drawing choice, not a measurement.
        </div>
      </div>
    </div>
  )
}

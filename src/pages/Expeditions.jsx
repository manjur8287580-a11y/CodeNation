/**
 * EXPEDITION MANAGEMENT
 * =====================
 * The first real module, and the template every other page follows:
 *
 *   1. read data with useData()
 *   2. show it with <DataTable> and <Badge>
 *   3. change it by calling an action from the store
 *
 * THE CONNECTED BIT (master prompt sections 12 and 19):
 *   Click any expedition and the right-hand panel loads its assigned team
 *   from the PERSONNEL data and its consignments from the CARGO data.
 *   Nothing is duplicated — the expedition record only stores an id, and
 *   the people and cargo are looked up live. Change someone's expedition
 *   and this panel changes with it.
 *
 *   Change an expedition's status in the dropdown and the dashboard's
 *   "Active Expeditions" count updates immediately, because that count is
 *   calculated from this same data.
 */

import { useState } from 'react'
import { ChevronRight, Package, Plus, Users, X } from 'lucide-react'

import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import Panel from '../components/Panel'
import StateBlock from '../components/StateBlock'
import { useData } from '../store/DataContext'
import { useAuth } from '../store/AuthContext'
import { clampPercent, formatDate } from '../lib/format'
import {
  CARGO_STATUS,
  EXPEDITION_STATUS,
  PERSONNEL_STATUS,
  PRIORITY,
  optionsFrom,
  statusLabel,
} from '../lib/statuses'

/* The blank form, kept here so "reset the form" is one line. */
const EMPTY_FORM = {
  name: '',
  destination: '',
  leader: '',
  start_date: '',
  end_date: '',
  team_size: '',
  objective: '',
}

export default function Expeditions({ goTo }) {
  const {
    expeditions,
    loading,
    error,
    updateExpedition,
    addExpedition,
    personnelForExpedition,
    cargoForExpedition,
    locations,
  } = useData()

  /* WHAT THIS ROLE MAY CHANGE. A read-only session still sees every record
     and every number on this page — it just cannot edit them. See
     src/lib/roles.js. */
  const { canManage } = useAuth()

  /* Which expedition's details are open on the right. Defaults to the
     first one so the panel is never empty when the page loads. */
  const [selectedId, setSelectedId] = useState(expeditions[0]?.id ?? null)

  /* Form state for adding a new expedition. */
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [formSuccess, setFormSuccess] = useState(null)

  const selected = expeditions.find((e) => e.id === selectedId) || null
  const team = selected ? personnelForExpedition(selected.id) : []
  const consignments = selected ? cargoForExpedition(selected.id) : []

  /* One handler for every text field, using the input's own name. */
  const setField = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
    setFormError(null)
  }

  /**
   * VALIDATION (master prompt section 21 — validate user input).
   * We check before saving, and we say exactly what is wrong.
   */
  function handleSubmit(event) {
    event.preventDefault()
    setFormSuccess(null)

    if (!form.name.trim()) return setFormError('Expedition name is required.')
    if (!form.destination.trim()) return setFormError('Destination is required.')
    if (!form.start_date) return setFormError('Start date is required.')
    if (!form.end_date) return setFormError('End date is required.')
    if (new Date(form.end_date) < new Date(form.start_date))
      return setFormError('End date cannot be before the start date.')

    const size = Number(form.team_size)
    if (form.team_size && (!Number.isInteger(size) || size < 0))
      return setFormError('Team size must be a whole number.')

    try {
      const created = addExpedition({
        name: form.name.trim(),
        destination: form.destination.trim(),
        leader: form.leader.trim() || 'To be assigned',
        start_date: form.start_date,
        end_date: form.end_date,
        team_size: size || 0,
        objective: form.objective.trim() || 'Objective to be confirmed.',
        location_id: null,
      })

      setForm(EMPTY_FORM)
      setFormError(null)
      setFormSuccess(`${created.id} created and added to the register.`)
      setSelectedId(created.id)
      setShowForm(false)
    } catch (err) {
      /* If saving ever fails, say so instead of silently doing nothing. */
      setFormError(`Could not save: ${err.message}`)
    }
  }

  return (
    <div className="space-y-5">
      {/* ---------- Summary strip ---------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: expeditions.length, tone: undefined },
          {
            label: 'Active',
            value: expeditions.filter((e) => e.status === 'ACTIVE').length,
            tone: 'ok',
          },
          {
            label: 'Planning',
            value: expeditions.filter((e) => e.status === 'PLANNING').length,
            tone: undefined,
          },
          {
            label: 'Completed',
            value: expeditions.filter((e) => e.status === 'COMPLETED').length,
            tone: undefined,
          },
        ].map((item) => (
          <div key={item.label} className="card-tight">
            <div className="eyebrow">{item.label}</div>
            <div className={`stat-value ${item.tone ? `stat-value--${item.tone}` : ''}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* ---------- Add form (hidden until asked for) ---------- */}
      {formSuccess && (
        <div className="alert-strip" style={{ borderLeftColor: 'var(--green)', borderColor: 'rgba(79,201,138,0.4)', background: 'rgba(79,201,138,0.07)' }}>
          <div className="text-[12.5px] text-mid">{formSuccess}</div>
        </div>
      )}

      {showForm && (
        <Panel
          eyebrow="New record"
          title="Register Expedition"
          subtitle="It will be created with PLANNING status and 0% progress."
          action={
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setShowForm(false)
                setFormError(null)
              }}
            >
              <X size={13} /> Cancel
            </button>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="field-label" htmlFor="exp-name">
                  Expedition name *
                </label>
                <input
                  id="exp-name"
                  name="name"
                  className="input"
                  value={form.name}
                  onChange={setField}
                  placeholder="e.g. Bharati Ice Core Survey"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="exp-dest">
                  Destination *
                </label>
                <input
                  id="exp-dest"
                  name="destination"
                  className="input"
                  value={form.destination}
                  onChange={setField}
                  placeholder="e.g. Bharati Station, Larsemann Hills"
                  list="known-locations"
                />
                {/* A datalist gives suggestions without forcing a choice. */}
                <datalist id="known-locations">
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="field-label" htmlFor="exp-leader">
                  Expedition leader
                </label>
                <input
                  id="exp-leader"
                  name="leader"
                  className="input"
                  value={form.leader}
                  onChange={setField}
                  placeholder="e.g. Dr. Arjun Sharma"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="exp-start">
                  Start date *
                </label>
                <input
                  id="exp-start"
                  name="start_date"
                  type="date"
                  className="input"
                  value={form.start_date}
                  onChange={setField}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="exp-end">
                  End date *
                </label>
                <input
                  id="exp-end"
                  name="end_date"
                  type="date"
                  className="input"
                  value={form.end_date}
                  onChange={setField}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="exp-team">
                  Team size
                </label>
                <input
                  id="exp-team"
                  name="team_size"
                  type="number"
                  min="0"
                  className="input"
                  value={form.team_size}
                  onChange={setField}
                  placeholder="e.g. 18"
                />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="exp-obj">
                Objective
              </label>
              <input
                id="exp-obj"
                name="objective"
                className="input"
                value={form.objective}
                onChange={setField}
                placeholder="What is this expedition for?"
              />
            </div>

            {formError && (
              <div className="alert-strip">
                <div className="text-[12.5px] text-hi">{formError}</div>
              </div>
            )}

            <button type="submit" className="btn">
              <Plus size={14} /> Create expedition
            </button>
          </form>
        </Panel>
      )}

      {/* ---------- The register + the detail panel ---------- */}
      <div className="grid gap-4 xl:grid-cols-5">
        <Panel
          className="xl:col-span-3"
          eyebrow="Register"
          title="All Expeditions"
          subtitle="Click a row to load its team and cargo"
          action={
            canManage &&
            !showForm && (
              <button type="button" className="btn btn--sm" onClick={() => setShowForm(true)}>
                <Plus size={13} /> New
              </button>
            )
          }
        >
          <DataTable
            loading={loading}
            error={error}
            rows={expeditions}
            rowKey={(row) => row.id}
            onRowClick={(row) => setSelectedId(row.id)}
            emptyTitle="No expeditions registered"
            emptyMessage="Use the New button to add the first one."
            columns={[
              { header: 'ID', cell: (r) => r.id, mono: true, width: '78px' },
              {
                header: 'Expedition',
                strong: true,
                cell: (r) => (
                  <div className="flex items-center gap-1.5">
                    <div>
                      <div>{r.name}</div>
                      <div className="text-[11px] font-normal text-low">{r.destination}</div>
                    </div>
                    {r.id === selectedId && (
                      <ChevronRight size={14} className="shrink-0 text-[var(--ice)]" />
                    )}
                  </div>
                ),
              },
              {
                header: 'Dates',
                width: '116px',
                mono: true,
                cell: (r) => (
                  <span className="text-[11px] text-mid">
                    {formatDate(r.start_date)}
                    <br />
                    {formatDate(r.end_date)}
                  </span>
                ),
              },
              {
                header: 'Progress',
                width: '110px',
                cell: (r) => (
                  <div>
                    <div className="mono mb-1 text-right text-[11px] text-mid">
                      {clampPercent(r.progress)}%
                    </div>
                    <div
                      className={`progress ${
                        r.status === 'COMPLETED'
                          ? 'progress--muted'
                          : r.progress < 30
                            ? 'progress--warn'
                            : ''
                      }`}
                    >
                      <span style={{ width: `${clampPercent(r.progress)}%` }} />
                    </div>
                  </div>
                ),
              },
              {
                /* THE CONNECTED CONTROL: changing this updates the
                   dashboard's Active Expeditions count instantly. */
                header: 'Status',
                width: '132px',
                cell: (r) => (
                  <select
                    className="select-inline"
                    value={r.status}
                    disabled={!canManage}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateExpedition(r.id, { status: e.target.value })}
                    aria-label={`Status for ${r.name}`}
                  >
                    {optionsFrom(EXPEDITION_STATUS).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ),
              },
            ]}
          />
        </Panel>

        {/* ---------- DETAIL: team and cargo, looked up live ---------- */}
        <div className="space-y-4 xl:col-span-2">
          {!selected ? (
            <Panel eyebrow="Detail" title="Expedition Detail">
              <StateBlock
                kind="empty"
                title="Nothing selected"
                message="Click an expedition in the register."
              />
            </Panel>
          ) : (
            <>
              <Panel
                eyebrow={selected.id}
                title={selected.name}
                subtitle={selected.objective}
                action={<Badge map={EXPEDITION_STATUS} value={selected.status} dot />}
              >
                <dl className="space-y-0">
                  <div className="kv">
                    <dt>Destination</dt>
                    <dd>{selected.destination}</dd>
                  </div>
                  <div className="kv">
                    <dt>Leader</dt>
                    <dd>{selected.leader}</dd>
                  </div>
                  <div className="kv">
                    <dt>Window</dt>
                    <dd className="mono text-[12px]">
                      {formatDate(selected.start_date)} → {formatDate(selected.end_date)}
                    </dd>
                  </div>
                  <div className="kv">
                    <dt>Planned team size</dt>
                    <dd className="mono">{selected.team_size}</dd>
                  </div>
                  <div className="kv">
                    <dt>Assigned on roster</dt>
                    <dd className="mono">{team.length}</dd>
                  </div>
                  <div className="kv">
                    <dt>Consignments</dt>
                    <dd className="mono">{consignments.length}</dd>
                  </div>
                </dl>
              </Panel>

              {/* Team — pulled from the personnel data by expedition_id. */}
              <Panel
                eyebrow="Connected data"
                title="Assigned Team"
                subtitle="Read live from Personnel Tracking"
                action={
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => goTo('personnel')}
                  >
                    <Users size={13} /> Open
                  </button>
                }
              >
                {team.length === 0 ? (
                  <StateBlock
                    kind="empty"
                    title="No personnel assigned yet"
                    message="Assign team members from the Personnel module."
                  />
                ) : (
                  <ul className="space-y-2">
                    {team.map((person) => (
                      <li key={person.id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] text-hi">{person.name}</div>
                          <div className="truncate text-[11px] text-low">
                            <span className="mono">{person.id}</span> · {person.role}
                          </div>
                        </div>
                        <Badge map={PERSONNEL_STATUS} value={person.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              {/* Cargo — pulled from the cargo data by expedition_id. */}
              <Panel
                eyebrow="Connected data"
                title="Assigned Cargo"
                subtitle="Read live from Cargo Tracking"
                action={
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => goTo('cargo')}
                  >
                    <Package size={13} /> Open
                  </button>
                }
              >
                {consignments.length === 0 ? (
                  <StateBlock
                    kind="empty"
                    title="No cargo assigned yet"
                    message="Log consignments from the Cargo module."
                  />
                ) : (
                  <ul className="space-y-2.5">
                    {consignments.map((item) => (
                      <li key={item.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] text-hi">{item.item_name}</div>
                          <div className="truncate text-[11px] text-low">
                            <span className="mono">{item.id}</span> · {item.quantity} {item.unit} ·{' '}
                            {statusLabel(CARGO_STATUS, item.status)}
                          </div>
                        </div>
                        <Badge map={PRIORITY} value={item.priority} />
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

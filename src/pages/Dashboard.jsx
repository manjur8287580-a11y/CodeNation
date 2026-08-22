/**
 * DASHBOARD — the page a judge sees first.
 *
 * Its whole job is to answer, in under 30 seconds: what is running right
 * now, and what needs attention?
 *
 * EVERY NUMBER ON THIS PAGE IS COUNTED FROM THE SHARED DATA.
 * Nothing here is typed in by hand. That is the point of the demo: go to
 * the Emergency page, report an incident, come back here, and the alert
 * count and the alert list have already changed. Drop an inventory item
 * below its minimum and the Low Stock card goes up. No page "tells"
 * another page to refresh — they all read the same single source.
 */

import { AlertTriangle, Boxes, Compass, Package, Radio, Siren, Users } from 'lucide-react'

import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import Panel from '../components/Panel'
import StatCard from '../components/StatCard'
import StateBlock from '../components/StateBlock'
import { useData } from '../store/DataContext'
import { clampPercent, formatDate, timeAgo } from '../lib/format'
import {
  CARGO_STATUS,
  EMERGENCY_STATUS,
  EMERGENCY_TYPE,
  EXPEDITION_STATUS,
  PRIORITY,
  SEVERITY,
  statusLabel,
} from '../lib/statuses'

/* Which colour the activity-log dot gets, per kind of event. */
const ACTIVITY_TONE = {
  EMERGENCY: 'alert',
  CARGO: 'info',
  INVENTORY: 'warn',
  PERSONNEL: 'ok',
  EXPEDITION: 'info',
  WEATHER: 'muted',
}

export default function Dashboard({ goTo }) {
  const { stats, expeditions, cargo, emergencies, activityLog, loading, error } = useData()

  const activeExpeditions = expeditions.filter((e) => e.status === 'ACTIVE')

  /* The consignments worth watching: anything late, or anything critical
     that has not landed yet. */
  const cargoNeedingAttention = cargo
    .filter((c) => c.status === 'DELAYED' || (c.priority === 'CRITICAL' && c.status !== 'ARRIVED'))
    .slice(0, 5)

  const openIncidents = emergencies.filter((e) => e.status !== 'RESOLVED')

  return (
    <div className="space-y-5">
      {/* ============================================================
          1. THE ALERT BANNER
          Only rendered when something is genuinely open. An always-on
          red banner trains people to ignore red banners.
          ============================================================ */}
      {openIncidents.length > 0 && (
        <div className="alert-strip">
          <Siren size={18} strokeWidth={2} className="pulse mt-0.5 shrink-0 text-[var(--red)]" />
          <div className="min-w-0 flex-1">
            <div className="font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--red)]">
              {openIncidents.length} open incident{openIncidents.length === 1 ? '' : 's'}
            </div>
            <div className="mt-1 text-[12.5px] text-mid">
              {openIncidents
                .slice(0, 2)
                .map(
                  (i) =>
                    `${i.id} · ${statusLabel(EMERGENCY_TYPE, i.type)} at ${i.location} (${statusLabel(SEVERITY, i.severity)})`
                )
                .join('  ·  ')}
              {openIncidents.length > 2 && `  ·  +${openIncidents.length - 2} more`}
            </div>
          </div>
          <button type="button" className="btn btn--alert btn--sm shrink-0" onClick={() => goTo('emergency')}>
            Respond
          </button>
        </div>
      )}

      {/* ============================================================
          2. THE HEADLINE NUMBERS
          Each card is clickable and takes you to the module behind it.
          ============================================================ */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard
          label="Active Expeditions"
          value={stats.expeditionsActive}
          hint={`${stats.expeditionsPlanning} in planning · ${stats.expeditionsTotal} total`}
          icon={Compass}
          onClick={() => goTo('expeditions')}
        />
        <StatCard
          label="Personnel Deployed"
          value={stats.personnelDeployed}
          hint={`${stats.personnelInTransit} in transit · ${stats.personnelTotal} on roster`}
          icon={Users}
          onClick={() => goTo('personnel')}
        />
        <StatCard
          label="Cargo In Transit"
          value={stats.cargoInTransit}
          hint={`${stats.cargoDelayed} delayed · ${stats.cargoTotal} consignments`}
          icon={Package}
          tone={stats.cargoDelayed > 0 ? 'warn' : undefined}
          onClick={() => goTo('cargo')}
        />
        <StatCard
          label="Low Stock Items"
          value={stats.lowStockCount}
          hint={`across ${stats.inventoryLocations} locations`}
          icon={Boxes}
          tone={stats.lowStockCount > 0 ? 'warn' : 'ok'}
          onClick={() => goTo('inventory')}
        />
        <StatCard
          label="Critical Alerts"
          value={stats.criticalAlerts}
          hint={`${stats.emergenciesActive} active · ${stats.emergenciesResponding} responding`}
          icon={AlertTriangle}
          tone={stats.criticalAlerts > 0 ? 'alert' : 'ok'}
          pulse={stats.criticalAlerts > 0}
          onClick={() => goTo('emergency')}
        />
      </div>

      {/* ============================================================
          3. ACTIVE EXPEDITIONS + OPEN INCIDENTS side by side
          ============================================================ */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          eyebrow="Operations"
          title="Active Expeditions"
          subtitle="Currently deployed in the field"
          action={
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => goTo('expeditions')}>
              Manage
            </button>
          }
        >
          <DataTable
            loading={loading}
            error={error}
            rows={activeExpeditions}
            rowKey={(row) => row.id}
            onRowClick={() => goTo('expeditions')}
            emptyTitle="No active expeditions"
            emptyMessage="Expeditions marked ACTIVE will appear here."
            columns={[
              { header: 'ID', cell: (r) => r.id, mono: true, width: '78px' },
              {
                header: 'Expedition',
                strong: true,
                cell: (r) => (
                  <div>
                    <div>{r.name}</div>
                    <div className="text-[11px] font-normal text-low">{r.destination}</div>
                  </div>
                ),
              },
              {
                header: 'Team',
                align: 'right',
                width: '60px',
                mono: true,
                cell: (r) => r.team_size,
              },
              {
                header: 'Ends',
                width: '104px',
                cell: (r) => <span className="mono text-[11.5px]">{formatDate(r.end_date)}</span>,
              },
              {
                header: 'Progress',
                width: '132px',
                cell: (r) => (
                  <div>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="text-low">{statusLabel(EXPEDITION_STATUS, r.status)}</span>
                      <span className="mono text-mid">{clampPercent(r.progress)}%</span>
                    </div>
                    <div className={`progress ${r.progress < 30 ? 'progress--warn' : ''}`}>
                      <span style={{ width: `${clampPercent(r.progress)}%` }} />
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </Panel>

        <Panel
          eyebrow="Response"
          title="Open Incidents"
          subtitle={
            openIncidents.length > 0
              ? `${stats.emergenciesActive} active, ${stats.emergenciesResponding} responding`
              : 'No incidents open'
          }
        >
          {loading ? (
            <StateBlock kind="loading" />
          ) : openIncidents.length === 0 ? (
            <StateBlock
              kind="empty"
              title="All clear"
              message="No open incidents across any expedition."
            />
          ) : (
            <ul className="space-y-2.5">
              {openIncidents.map((incident) => (
                <li
                  key={incident.id}
                  className="card-tight card-interactive cursor-pointer"
                  onClick={() => goTo('emergency')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="mono text-[11px] text-low">{incident.id}</span>
                    <Badge map={EMERGENCY_STATUS} value={incident.status} />
                  </div>
                  <div className="mt-1.5 text-[13px] font-medium text-hi">
                    {statusLabel(EMERGENCY_TYPE, incident.type)}
                  </div>
                  <div className="text-[11.5px] text-mid">{incident.location}</div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Badge map={SEVERITY} value={incident.severity} />
                    <span className="mono text-[10.5px] text-low">
                      {timeAgo(incident.reported_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ============================================================
          4. CARGO NEEDING ATTENTION + LOW STOCK + ACTIVITY
          ============================================================ */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          eyebrow="Logistics"
          title="Cargo Needing Attention"
          subtitle="Delayed or critical-priority consignments"
          action={
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => goTo('cargo')}>
              All cargo
            </button>
          }
        >
          {loading ? (
            <StateBlock kind="loading" />
          ) : cargoNeedingAttention.length === 0 ? (
            <StateBlock
              kind="empty"
              title="Nothing flagged"
              message="No delayed or critical consignments."
            />
          ) : (
            <ul className="space-y-2.5">
              {cargoNeedingAttention.map((item) => (
                <li key={item.id} className="card-tight">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-hi">{item.item_name}</div>
                      <div className="mono mt-0.5 text-[11px] text-low">
                        {item.id} · {item.location} → {item.destination}
                      </div>
                    </div>
                    <Badge map={PRIORITY} value={item.priority} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge map={CARGO_STATUS} value={item.status} />
                    {item.delay_reason && (
                      <span className="text-[11px] text-low">{item.delay_reason}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          eyebrow="Logistics"
          title="Low Stock"
          subtitle="Calculated live: quantity at or below minimum"
          action={
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => goTo('inventory')}>
              Inventory
            </button>
          }
        >
          {loading ? (
            <StateBlock kind="loading" />
          ) : stats.lowStockItems.length === 0 ? (
            <StateBlock
              kind="empty"
              title="Stock levels healthy"
              message="Every item is above its minimum."
            />
          ) : (
            <dl className="space-y-0">
              {stats.lowStockItems.map((item) => (
                <div key={item.id} className="kv">
                  <dt className="min-w-0">
                    <span className="text-mid">{item.item_name}</span>
                    <span className="block text-[11px] text-low">{item.location}</span>
                  </dt>
                  <dd className="shrink-0">
                    <span
                      className="mono text-[12.5px]"
                      style={{ color: item.quantity === 0 ? 'var(--red)' : 'var(--amber)' }}
                    >
                      {item.quantity} / {item.minimum_quantity}
                    </span>
                    <span className="block text-[10.5px] text-low">{item.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Panel>

        <Panel
          eyebrow="Audit"
          title="Recent Activity"
          subtitle="Every change made in this console"
        >
          {activityLog.length === 0 ? (
            <StateBlock kind="empty" title="No activity yet" />
          ) : (
            <ul className="space-y-3">
              {activityLog.slice(0, 8).map((entry) => (
                <li key={entry.id} className="flex gap-2.5">
                  <i
                    className={`dot dot--${ACTIVITY_TONE[entry.kind] || 'muted'} mt-1.5 shrink-0`}
                  />
                  <div className="min-w-0">
                    <div className="text-[12.5px] leading-snug text-mid">{entry.message}</div>
                    <div className="mono mt-0.5 text-[10.5px] text-low">
                      {entry.kind} · {timeAgo(entry.at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ============================================================
          5. AN HONEST FOOTER
          Master prompt section 21. We say plainly what this data is.
          Being upfront about it reads as competence, not weakness.
          ============================================================ */}
      <div className="alert-strip alert-strip--warn">
        <Radio size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--amber)]" />
        <div className="text-[12px] leading-relaxed text-mid">
          <strong className="text-hi">Prototype data notice.</strong> Station coordinates are real
          published NCPOR positions. All personnel names are fictional and all personnel/vessel
          positions are <span className="text-hi">simulated demo values</span> — this prototype does
          not connect to real GPS units, satellite trackers or NCPOR systems. Weather is fetched
          live from Open-Meteo where the network allows, and is clearly labelled as fallback data
          when it is not.
        </div>
      </div>
    </div>
  )
}

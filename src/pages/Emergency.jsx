/* EMERGENCY RESPONSE — built in Phase 9. This is the demo's centrepiece.

   The Emergency page already has a working data path behind it: the
   reportEmergency() action in src/store/DataContext.jsx adds the incident,
   flips the affected person to EMERGENCY status, and raises the dashboard
   alert count. Phase 9 builds the form and the response board on top. */

import ModulePlaceholder from '../components/ModulePlaceholder'
import { useData } from '../store/DataContext'

export default function Emergency() {
  const { emergencies, stats } = useData()

  return (
    <ModulePlaceholder
      phase={9}
      title="Emergency Response"
      records={emergencies.length}
      recordLabel={`incidents on record · ${stats.emergenciesOpen} still open`}
      features={[
        'Report an incident: type, location, severity, affected person',
        'Prominent alert board for everything still open',
        'Mark an incident as Responding or Resolved',
        'Reporting an incident raises the dashboard alert count automatically',
        'Resolving it releases the affected person back to Active',
      ]}
    />
  )
}

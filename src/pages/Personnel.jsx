/* PERSONNEL TRACKING — built in Phase 4. */

import ModulePlaceholder from '../components/ModulePlaceholder'
import { useData } from '../store/DataContext'

export default function Personnel() {
  const { personnel } = useData()

  return (
    <ModulePlaceholder
      phase={4}
      title="Personnel Tracking"
      records={personnel.length}
      recordLabel="personnel records"
      features={[
        'Full roster with role, expedition and duty status',
        'Filter by expedition and by status',
        'Last reported position and time since last check-in',
        'Change a status and watch the dashboard counts follow',
      ]}
    />
  )
}

/* CARGO TRACKING — built in Phase 5. */

import ModulePlaceholder from '../components/ModulePlaceholder'
import { useData } from '../store/DataContext'

export default function Cargo() {
  const { cargo } = useData()

  return (
    <ModulePlaceholder
      phase={5}
      title="Cargo Tracking"
      records={cargo.length}
      recordLabel="consignments"
      features={[
        'Filters on status, category and priority',
        'Origin → destination for every consignment',
        'Change a status and watch the dashboard update',
        'Delay reasons shown against late shipments',
      ]}
    />
  )
}

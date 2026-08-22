/* MAP INTEGRATION — built in Phase 6 with Leaflet + OpenStreetMap. */

import ModulePlaceholder from '../components/ModulePlaceholder'
import { useData } from '../store/DataContext'

export default function MapView() {
  const { locations, personnel } = useData()

  return (
    <ModulePlaceholder
      phase={6}
      title="Map Integration"
      records={locations.length}
      recordLabel={`locations · ${personnel.length} tracked personnel`}
      features={[
        'Leaflet map with free OpenStreetMap tiles (no API key needed)',
        'Markers for stations, field camps and vessels',
        'Personnel markers coloured by duty status',
        'Click a marker for its details',
        'All positions are simulated demo data, clearly labelled as such',
      ]}
    />
  )
}

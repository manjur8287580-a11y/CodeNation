/* WEATHER INTEGRATION — built in Phase 8 using the Open-Meteo API. */

import ModulePlaceholder from '../components/ModulePlaceholder'
import { useData } from '../store/DataContext'

export default function Weather() {
  const { locations } = useData()

  const stations = locations.filter((loc) => loc.type === 'STATION')

  return (
    <ModulePlaceholder
      phase={8}
      title="Weather Integration"
      records={stations.length}
      recordLabel="research stations to report on"
      features={[
        'Live conditions from Open-Meteo (a free API — no key required)',
        'Temperature, wind speed and wind chill per station',
        'Short forecast so a judge can see the trend',
        'If the network fails, clearly-labelled fallback data — never a blank screen, and never fallback data passed off as live',
      ]}
    />
  )
}

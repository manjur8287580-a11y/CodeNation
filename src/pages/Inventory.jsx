/* INVENTORY MANAGEMENT — built in Phase 5, chart added in Phase 7. */

import ModulePlaceholder from '../components/ModulePlaceholder'
import { useData } from '../store/DataContext'

export default function Inventory() {
  const { inventory, stats } = useData()

  return (
    <ModulePlaceholder
      phase={5}
      title="Inventory Management"
      records={inventory.length}
      recordLabel={`items · ${stats.lowStockCount} already flagged low`}
      features={[
        'Stock level per item per location',
        'Automatic LOW STOCK detection when quantity ≤ minimum',
        'Increase or decrease a quantity and watch the badge change',
        'Stock-by-category chart (Phase 7)',
      ]}
    />
  )
}

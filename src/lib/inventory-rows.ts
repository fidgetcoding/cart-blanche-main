interface HasId {
  id: string;
}

/**
 * Which rows the inventory lists. The grid hook's list can include a store's own
 * products, so they're removed from it to avoid listing them twice. Samples only
 * stay alongside real rows in the demo: a real store just sees what it sells.
 */
export function mergeInventoryRows<Row extends HasId>(dbRows: Row[], gridRows: Row[], isDemo: boolean): Row[] {
  if (!isDemo) return dbRows;
  const dbIds = new Set(dbRows.map(row => row.id));
  return [...dbRows, ...gridRows.filter(row => !dbIds.has(row.id))];
}

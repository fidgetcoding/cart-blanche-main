import { toCsv } from './csv';

interface ExportableOrder {
  order_number: string;
  created_at: string;
  customer_name: string | null;
  customer_email: string;
  items: { quantity?: number; qty?: number }[] | null;
  total: number;
  status: string;
  tracking_number: string | null;
}

export function ordersCsv(rows: ExportableOrder[]): string {
  return toCsv(
    ['order', 'date', 'customer', 'email', 'items', 'total', 'status', 'tracking'],
    rows.map(o => [
      o.order_number,
      new Date(o.created_at).toISOString(),
      o.customer_name ?? '',
      o.customer_email,
      String((o.items ?? []).reduce((sum, item) => sum + (item.quantity ?? item.qty ?? 1), 0)),
      Number(o.total).toFixed(2),
      o.status,
      o.tracking_number ?? '',
    ]),
  );
}

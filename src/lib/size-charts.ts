import { supabase } from '@/integrations/supabase/client';

export interface SizeChart {
  id?: string;
  merchant_id?: string;
  category: string;
  name: string;
  unit: 'in' | 'cm';
  headers: string[];
  rows: string[][];
}

// Fake/default per-category charts used when nothing is in the database yet.
export const DEFAULT_CHARTS: Record<string, SizeChart> = {
  shirt: {
    category: 'shirt',
    name: 'Tops Size Chart',
    unit: 'in',
    headers: ['Size', 'Chest', 'Waist', 'Length', 'Sleeve'],
    rows: [
      ['XS', '34', '28', '26', '23'],
      ['S', '36', '30', '27', '24'],
      ['M', '38', '32', '28', '25'],
      ['L', '40', '34', '29', '26'],
      ['XL', '42', '36', '30', '27'],
    ],
  },
  jacket: {
    category: 'jacket',
    name: 'Outerwear Size Chart',
    unit: 'in',
    headers: ['Size', 'Chest', 'Shoulder', 'Length', 'Sleeve'],
    rows: [
      ['XS', '36', '16', '27', '24'],
      ['S', '38', '17', '28', '25'],
      ['M', '40', '18', '29', '26'],
      ['L', '42', '19', '30', '27'],
      ['XL', '44', '20', '31', '28'],
    ],
  },
  pants: {
    category: 'pants',
    name: 'Bottoms Size Chart',
    unit: 'in',
    headers: ['Size', 'Waist', 'Hip', 'Inseam', 'Rise'],
    rows: [
      ['28', '28', '36', '30', '10'],
      ['30', '30', '38', '30', '10.5'],
      ['32', '32', '40', '31', '11'],
      ['34', '34', '42', '32', '11.5'],
      ['36', '36', '44', '32', '12'],
    ],
  },
  shorts: {
    category: 'shorts',
    name: 'Shorts Size Chart',
    unit: 'in',
    headers: ['Size', 'Waist', 'Hip', 'Inseam'],
    rows: [
      ['XS', '28', '36', '7'],
      ['S', '30', '38', '7.5'],
      ['M', '32', '40', '8'],
      ['L', '34', '42', '8.5'],
      ['XL', '36', '44', '9'],
    ],
  },
  accessory: {
    category: 'accessory',
    name: 'Accessories Size Chart',
    unit: 'in',
    headers: ['Size', 'One Size'],
    rows: [['OS', 'Universal']],
  },
};

export const CHART_CATEGORIES = ['shirt', 'jacket', 'pants', 'shorts', 'accessory'] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  shirt: 'Tops',
  jacket: 'Outerwear',
  pants: 'Bottoms',
  shorts: 'Shorts',
  accessory: 'Accessories',
};

export function normalizeCategory(category?: string | null): string {
  if (!category) return 'shirt';
  const c = category.toLowerCase();
  if (CHART_CATEGORIES.includes(c as typeof CHART_CATEGORIES[number])) return c;
  // Fallbacks
  if (c.includes('top') || c.includes('shirt') || c.includes('tee')) return 'shirt';
  if (c.includes('coat') || c.includes('jacket') || c.includes('outer')) return 'jacket';
  if (c.includes('pant') || c.includes('trouser') || c.includes('jean')) return 'pants';
  if (c.includes('short')) return 'shorts';
  return 'accessory';
}

/** Fetch a chart for a given category. Falls back to DEFAULT_CHARTS. */
export async function fetchSizeChart(category: string): Promise<SizeChart> {
  const cat = normalizeCategory(category);
  const { data } = await supabase
    .from('size_charts')
    .select('*')
    .eq('category', cat)
    .limit(1)
    .maybeSingle();

  if (data) {
    return {
      id: data.id,
      merchant_id: data.merchant_id,
      category: data.category,
      name: data.name,
      unit: (data.unit as 'in' | 'cm') ?? 'in',
      headers: (data.headers as string[]) ?? DEFAULT_CHARTS[cat].headers,
      rows: (data.rows as string[][]) ?? DEFAULT_CHARTS[cat].rows,
    };
  }
  return DEFAULT_CHARTS[cat];
}

/** Fetch all charts for the current merchant (admin editor). */
export async function fetchAllSizeCharts(merchantId: string): Promise<Record<string, SizeChart>> {
  const { data } = await supabase
    .from('size_charts')
    .select('*')
    .eq('merchant_id', merchantId);

  const result: Record<string, SizeChart> = {};
  for (const cat of CHART_CATEGORIES) {
    result[cat] = { ...DEFAULT_CHARTS[cat], merchant_id: merchantId };
  }
  if (data) {
    for (const row of data) {
      result[row.category] = {
        id: row.id,
        merchant_id: row.merchant_id,
        category: row.category,
        name: row.name,
        unit: (row.unit as 'in' | 'cm') ?? 'in',
        headers: (row.headers as string[]) ?? DEFAULT_CHARTS[row.category]?.headers ?? [],
        rows: (row.rows as string[][]) ?? DEFAULT_CHARTS[row.category]?.rows ?? [],
      };
    }
  }
  return result;
}

export async function upsertSizeChart(chart: SizeChart, merchantId: string): Promise<void> {
  const payload = {
    merchant_id: merchantId,
    category: chart.category,
    name: chart.name,
    unit: chart.unit,
    headers: chart.headers,
    rows: chart.rows,
  };
  await supabase
    .from('size_charts')
    .upsert(payload, { onConflict: 'merchant_id,category' });
}

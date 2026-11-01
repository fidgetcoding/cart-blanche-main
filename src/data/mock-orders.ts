// Mock orders built from real store inventory (DEMO_PRODUCTS)
// 100 orders, prices match product catalog exactly

import { DEMO_PRODUCTS, getImageUrl } from './demo-data';

const FIRST_NAMES = ['Alex','Jordan','Morgan','Taylor','Casey','Riley','Jamie','Quinn','Avery','Blake','Drew','Skyler','Reese','Parker','Hayden','Dakota','Emery','Sage','River','Rowan','Kai','Logan','Cameron','Finley','Elliot','Harper','Lennox','Nico','Wren','Jules'];
const LAST_NAMES = ['Chen','Williams','Martinez','Johnson','Lee','Patel','Kim','Garcia','Anderson','Taylor','Brown','Wilson','Thomas','Moore','Jackson','White','Harris','Clark','Lewis','Hall','Young','Walker','Allen','King','Scott','Green','Adams','Baker','Rivera','Hill'];
const CITIES = ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','Austin','Toronto','Vancouver','London','Berlin','Sydney','Melbourne','Seattle','Portland','Denver','Miami'];
const STATES = ['NY','CA','IL','TX','AZ','PA','TX','CA','TX','TX','ON','BC','UK','DE','NSW','VIC','WA','OR','CO','FL'];
const COUNTRIES = ['US','US','US','US','US','US','US','US','US','US','CA','CA','GB','DE','AU','AU','US','US','US','US'];
const SIZES = ['XS','S','M','L','XL'];

const STATUSES = ['pending','fulfilled','shipped','delivered','cancelled'];
const STATUS_WEIGHTS = [0.10, 0.15, 0.18, 0.52, 0.05];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function weightedPick(items: string[], weights: number[], rand: () => number): string {
  const r = rand();
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += weights[i];
    if (r <= sum) return items[i];
  }
  return items[items.length - 1];
}

export interface MockOrderItem {
  title: string;
  variant: string;
  qty: number;
  price: number;
  image: string;
  product_id: string;
}

export interface MockOrder {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string;
  items: MockOrderItem[];
  subtotal: number;
  total: number;
  status: string;
  tracking_number: string | null;
  shipping_address: { name: string; line1: string; city: string; state: string; zip: string; country: string };
  notes: string | null;
  created_at: string;
}

let _cached: MockOrder[] | null = null;

export function generateMockOrders(count: number = 100): MockOrder[] {
  if (_cached && _cached.length === count) return _cached;

  const rand = seededRandom(77);
  const orders: MockOrder[] = [];
  const now = Date.now();
  const products = DEMO_PRODUCTS;

  for (let i = 0; i < count; i++) {
    const firstName = pick(FIRST_NAMES, rand);
    const lastName = pick(LAST_NAMES, rand);
    const cityIdx = Math.floor(rand() * CITIES.length);
    const numItems = rand() < 0.55 ? 1 : rand() < 0.80 ? 2 : 3;
    const items: MockOrderItem[] = [];

    const usedIds = new Set<string>();
    for (let j = 0; j < numItems; j++) {
      let prod = pick(products, rand);
      let attempts = 0;
      while (usedIds.has(prod.id) && attempts < 10) {
        prod = pick(products, rand);
        attempts++;
      }
      usedIds.add(prod.id);
      const size = pick(SIZES, rand);
      items.push({
        title: prod.title,
        variant: size,
        qty: 1,
        price: prod.price,
        image: getImageUrl(prod.images[0], 'thumb'),
        product_id: prod.id,
      });
    }

    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const total = subtotal;
    const status = weightedPick(STATUSES, STATUS_WEIGHTS, rand);
    const daysAgo = Math.floor(rand() * 120);
    const hoursAgo = Math.floor(rand() * 24);
    const createdAt = new Date(now - daysAgo * 86400000 - hoursAgo * 3600000).toISOString();

    const hasTracking = status === 'shipped' || status === 'delivered';
    const trackingNumber = hasTracking ? `1Z${String(Math.floor(rand() * 999999999)).padStart(9, '0')}` : null;

    orders.push({
      id: `mock-${String(i + 1).padStart(4, '0')}`,
      order_number: `CB-${String(1001 + i).padStart(4, '0')}`,
      customer_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      customer_name: `${firstName} ${lastName}`,
      items,
      subtotal,
      total,
      status,
      tracking_number: trackingNumber,
      shipping_address: {
        name: `${firstName} ${lastName}`,
        line1: `${Math.floor(rand() * 9999) + 1} ${pick(['Main St','Oak Ave','Elm Blvd','Park Dr','Broadway','Market St','5th Ave','Sunset Blvd'], rand)}`,
        city: CITIES[cityIdx],
        state: STATES[cityIdx],
        zip: String(10000 + Math.floor(rand() * 89999)),
        country: COUNTRIES[cityIdx],
      },
      notes: rand() < 0.12 ? pick(['Gift wrap please','Leave at door','Ring doorbell','Fragile items','Rush delivery requested'], rand) : null,
      created_at: createdAt,
    });
  }

  orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  _cached = orders;
  return orders;
}

export function getMockOrderStats() {
  const orders = generateMockOrders(100);
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const nonCancelled = orders.filter(o => o.status !== 'cancelled');
  return {
    totalOrders: orders.length,
    totalRevenue,
    avgOrderValue: nonCancelled.length > 0 ? nonCancelled.reduce((s, o) => s + o.total, 0) / nonCancelled.length : 0,
  };
}

// Time-range helpers
const CHANNELS = ['Direct','Social','Referral','Email'] as const;
const REGIONS = ['United States','Canada','United Kingdom','Germany','Australia','France'] as const;
const REFERRERS = ['Direct / None','instagram.com','tiktok.com','google.com','pinterest.com'] as const;

function getDaysForRange(range: string): number {
  switch (range) {
    case '1D': return 1;
    case '7D': return 7;
    case '1M': return 30;
    case '3M': return 90;
    case '6M': return 180;
    case '1Y': return 365;
    case 'YTD': {
      const now = new Date();
      const jan1 = new Date(now.getFullYear(), 0, 1);
      return Math.ceil((now.getTime() - jan1.getTime()) / 86400000);
    }
    default: return 30;
  }
}

function getPreviousPeriodOrders(orders: MockOrder[], days: number): MockOrder[] {
  const now = Date.now();
  const periodStart = now - days * 86400000;
  const prevStart = periodStart - days * 86400000;
  return orders.filter(o => {
    const t = new Date(o.created_at).getTime();
    return t >= prevStart && t < periodStart;
  });
}

export interface DashboardData {
  totalSales: number;
  totalOrders: number;
  avgOrderValue: number;
  netProfit: number;
  netProfitMargin: number;
  salesChange: number;
  ordersChange: number;
  profitChange: number;
  avgChange: number;
  channelData: { name: string; value: number; color: string }[];
  locationData: { region: string; amount: number }[];
  referrerData: { source: string; amount: number }[];
  plData: { label: string; amount: number }[];
  salesChartData: { name: string; current: number; previous: number }[];
  orderChartData: { name: string; current: number; previous: number }[];
}

export function getDashboardDataForRange(range: string): DashboardData {
  const allOrders = generateMockOrders(100);
  const days = getDaysForRange(range);
  const now = Date.now();
  const cutoff = now - days * 86400000;

  const filtered = allOrders.filter(o => new Date(o.created_at).getTime() >= cutoff);
  const previous = getPreviousPeriodOrders(allOrders, days);

  const totalSales = filtered.reduce((s, o) => s + o.total, 0);
  const prevSales = previous.reduce((s, o) => s + o.total, 0);
  const nonCancelled = filtered.filter(o => o.status !== 'cancelled');
  const prevNonCancelled = previous.filter(o => o.status !== 'cancelled');
  const avgOrderValue = nonCancelled.length > 0 ? nonCancelled.reduce((s, o) => s + o.total, 0) / nonCancelled.length : 0;
  const prevAvg = prevNonCancelled.length > 0 ? prevNonCancelled.reduce((s, o) => s + o.total, 0) / prevNonCancelled.length : 0;

  // Costs are proportional
  const discountRate = 0.06;
  const refundRate = 0.02;
  const shippingRate = 0.05;
  const processingRate = 0.03;
  const grossSales = totalSales;
  const discounts = -(grossSales * discountRate);
  const refunds = -(grossSales * refundRate);
  const shipping = -(grossSales * shippingRate);
  const processing = -(grossSales * processingRate);
  const totalCosts = discounts + refunds + shipping + processing;
  const netProfit = grossSales + totalCosts;
  const netProfitMargin = grossSales > 0 ? (netProfit / grossSales) * 100 : 0;

  const prevNet = prevSales > 0 ? prevSales * (1 - discountRate - refundRate - shippingRate - processingRate) : 0;

  // Distribute orders across channels/locations/referrers deterministically using seeded hash
  const rand = seededRandom(42);
  const channelCounts: Record<string, number> = { Direct: 0, Social: 0, Referral: 0, Email: 0 };
  const locationAmounts: Record<string, number> = {};
  REGIONS.forEach(r => locationAmounts[r] = 0);
  const referrerAmounts: Record<string, number> = {};
  REFERRERS.forEach(r => referrerAmounts[r] = 0);

  filtered.forEach(order => {
    const ch = CHANNELS[Math.floor(rand() * CHANNELS.length)];
    channelCounts[ch]++;
    const reg = REGIONS[Math.floor(rand() * REGIONS.length)];
    locationAmounts[reg] += order.total;
    const ref = REFERRERS[Math.floor(rand() * REFERRERS.length)];
    referrerAmounts[ref] += order.total;
  });

  const channelColors = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--accent-foreground))'];
  const channelData = CHANNELS.map((c, i) => ({ name: c, value: channelCounts[c], color: channelColors[i] }));
  const locationData = REGIONS.map(r => ({ region: r, amount: Math.round(locationAmounts[r]) })).filter(l => l.amount > 0).sort((a, b) => b.amount - a.amount);
  const referrerData = REFERRERS.map(r => ({ source: r, amount: Math.round(referrerAmounts[r]) })).filter(r => r.amount > 0).sort((a, b) => b.amount - a.amount);

  const plData = [
    { label: 'Gross Sales', amount: Math.round(grossSales) },
    { label: 'Discounts', amount: Math.round(discounts) },
    { label: 'Refunds', amount: Math.round(refunds) },
    { label: 'Shipping Costs', amount: Math.round(shipping) },
    { label: 'Processing Fees', amount: Math.round(processing) },
    { label: 'Total Costs', amount: Math.round(totalCosts) },
  ];

  // Build chart data — bucket orders into time segments
  const numBuckets = Math.min(days <= 1 ? 24 : days <= 7 ? 7 : 12, days);
  const bucketSize = (days * 86400000) / numBuckets;
  const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const salesBuckets: number[] = new Array(numBuckets).fill(0);
  const orderBuckets: number[] = new Array(numBuckets).fill(0);
  const prevSalesBuckets: number[] = new Array(numBuckets).fill(0);
  const prevOrderBuckets: number[] = new Array(numBuckets).fill(0);

  filtered.forEach(o => {
    const t = new Date(o.created_at).getTime();
    const idx = Math.min(Math.floor((t - cutoff) / bucketSize), numBuckets - 1);
    if (idx >= 0) {
      salesBuckets[idx] += o.total;
      orderBuckets[idx]++;
    }
  });

  const prevCutoff = cutoff - days * 86400000;
  previous.forEach(o => {
    const t = new Date(o.created_at).getTime();
    const idx = Math.min(Math.floor((t - prevCutoff) / bucketSize), numBuckets - 1);
    if (idx >= 0) {
      prevSalesBuckets[idx] += o.total;
      prevOrderBuckets[idx]++;
    }
  });

  const salesChartData = salesBuckets.map((v, i) => {
    let name: string;
    if (days <= 1) name = `${i}:00`;
    else if (days <= 7) name = dayLabels[new Date(cutoff + i * bucketSize).getDay()];
    else {
      const d = new Date(cutoff + i * bucketSize);
      name = `${monthLabels[d.getMonth()]} ${d.getDate()}`;
    }
    return { name, current: Math.round(v), previous: Math.round(prevSalesBuckets[i]) };
  });

  const orderChartData = orderBuckets.map((v, i) => ({
    name: salesChartData[i].name,
    current: v,
    previous: prevOrderBuckets[i],
  }));

  return {
    totalSales: Math.round(totalSales),
    totalOrders: filtered.length,
    avgOrderValue: Math.round(avgOrderValue),
    netProfit: Math.round(netProfit),
    netProfitMargin: Math.round(netProfitMargin),
    salesChange: Math.round(totalSales - prevSales),
    ordersChange: filtered.length - previous.length,
    profitChange: Math.round(netProfit - prevNet),
    avgChange: Math.round(avgOrderValue - prevAvg),
    channelData,
    locationData,
    referrerData,
    plData,
    salesChartData,
    orderChartData,
  };
}

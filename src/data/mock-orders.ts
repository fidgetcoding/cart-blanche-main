// Mock orders that correlate with dashboard figures:
// ~$108K total sales, ~501 orders, avg ~$216/order

const FIRST_NAMES = ['Alex','Jordan','Morgan','Taylor','Casey','Riley','Jamie','Quinn','Avery','Blake','Drew','Skyler','Reese','Parker','Hayden','Dakota','Emery','Sage','River','Rowan'];
const LAST_NAMES = ['Chen','Williams','Martinez','Johnson','Lee','Patel','Kim','Garcia','Anderson','Taylor','Brown','Wilson','Thomas','Moore','Jackson','White','Harris','Clark','Lewis','Hall'];
const CITIES = ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','Austin','Toronto','Vancouver','London','Berlin','Sydney','Melbourne'];
const STATES = ['NY','CA','IL','TX','AZ','PA','TX','CA','TX','TX','ON','BC','UK','DE','NSW','VIC'];
const COUNTRIES = ['US','US','US','US','US','US','US','US','US','US','CA','CA','GB','DE','AU','AU'];
const PRODUCTS = [
  { title: 'Cloud Puffer Jacket', variant: 'M', price: 420 },
  { title: 'Stealth Trench', variant: 'L', price: 380 },
  { title: 'Wool Overcoat', variant: 'M', price: 550 },
  { title: 'Leather Moto Jacket', variant: 'S', price: 680 },
  { title: 'Bomber Mk IV', variant: 'L', price: 290 },
  { title: 'Windbreaker Shell', variant: 'M', price: 195 },
  { title: 'Track Jacket', variant: 'XL', price: 210 },
  { title: 'Deconstructed Blazer', variant: 'M', price: 340 },
  { title: 'Graphic Hoodie', variant: 'L', price: 145 },
  { title: 'Core Crewneck', variant: 'M', price: 95 },
  { title: 'Knit Polo', variant: 'S', price: 125 },
  { title: 'Long Sleeve Base', variant: 'M', price: 70 },
  { title: 'Oversized Tee', variant: 'L', price: 65 },
  { title: 'Tank Top', variant: 'M', price: 40 },
  { title: 'Maroon Crop Top', variant: 'S', price: 55 },
  { title: 'Cargo Pants', variant: 'M', price: 175 },
  { title: 'Crème Joggers', variant: 'L', price: 120 },
  { title: 'Utility Pant', variant: 'M', price: 165 },
  { title: 'Mesh Shorts', variant: 'L', price: 85 },
  { title: 'Sweat Shorts', variant: 'M', price: 75 },
];

const STATUSES = ['pending','fulfilled','shipped','delivered','cancelled'];
const STATUS_WEIGHTS = [0.12, 0.18, 0.15, 0.50, 0.05]; // most are delivered

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

export interface MockOrder {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string;
  items: { title: string; variant: string; qty: number; price: number }[];
  subtotal: number;
  total: number;
  status: string;
  tracking_number: string | null;
  shipping_address: { name: string; line1: string; city: string; state: string; zip: string; country: string };
  notes: string | null;
  created_at: string;
}

export function generateMockOrders(count: number = 50): MockOrder[] {
  const rand = seededRandom(42);
  const orders: MockOrder[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const firstName = pick(FIRST_NAMES, rand);
    const lastName = pick(LAST_NAMES, rand);
    const cityIdx = Math.floor(rand() * CITIES.length);
    const numItems = rand() < 0.6 ? 1 : rand() < 0.8 ? 2 : 3;
    const items: { title: string; variant: string; qty: number; price: number }[] = [];

    for (let j = 0; j < numItems; j++) {
      const prod = pick(PRODUCTS, rand);
      items.push({ title: prod.title, variant: prod.variant, qty: 1, price: prod.price });
    }

    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const total = subtotal;
    const status = weightedPick(STATUSES, STATUS_WEIGHTS, rand);
    const daysAgo = Math.floor(rand() * 90);
    const hoursAgo = Math.floor(rand() * 24);
    const createdAt = new Date(now - daysAgo * 86400000 - hoursAgo * 3600000).toISOString();

    const hasTracking = status === 'shipped' || status === 'delivered';
    const trackingNumber = hasTracking ? `1Z${String(Math.floor(rand() * 999999999)).padStart(9, '0')}` : null;

    orders.push({
      id: `mock-${String(i + 1).padStart(4, '0')}`,
      order_number: `#CB-${String(1001 + i)}`,
      customer_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
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
      notes: rand() < 0.15 ? pick(['Gift wrap please','Leave at door','Ring doorbell','Fragile items','Rush delivery requested'], rand) : null,
      created_at: createdAt,
    });
  }

  // Sort newest first
  orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return orders;
}

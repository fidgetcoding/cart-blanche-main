// Demo seed data for the spatial storefront

// Multi-resolution image URL builder
// Images are in public/products/ — served on-demand, not bundled
export interface ProductImage {
  thumb: string;     // 400px - grid tiles
  medium: string;    // 800px - product detail
  full: string;      // 1920px - zoom/fullscreen
}

function imgSet(baseName: string): ProductImage {
  const base = `/products/${baseName}`;
  return {
    thumb: `${base}-thumb.webp`,
    medium: `${base}-medium.webp`,
    full: `${base}-full.webp`,
  };
}

/** Extract a display-ready URL from a ProductImage or plain string */
export function getImageUrl(
  img: ProductImage | string | undefined,
  size: 'thumb' | 'medium' | 'full' = 'thumb'
): string {
  if (!img) return '/placeholder.svg';
  if (typeof img === 'string') return img;
  return img[size];
}

export type ProductCategory = 'shirt' | 'pants' | 'jacket' | 'hat' | 'accessory' | 'shorts' | '';

export const PRODUCT_CATEGORIES: ProductCategory[] = ['shirt', 'pants', 'jacket', 'shorts', 'hat', 'accessory'];

export interface DemoProduct {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number;
  images: ProductImage[];
  category: string;
  product_category: ProductCategory;
  status: 'active';
  grid_position: { x: number; y: number };
  variants: DemoVariant[];
  description: string;
  weight_oz?: number;
  shipping_type?: 'domestic' | 'international';
  hs_code?: string;
}

export interface DemoVariant {
  id: string;
  title: string;
  options: Record<string, string>;
  inventory_count: number;
  price?: number;
}

export interface DemoHotzone {
  id: string;
  name: string;
  position: { x: number; y: number; width: number; height: number };
  style_config: { color: string };
  neighbors: { up?: string; down?: string; left?: string; right?: string };
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

function makeVariants(prefix: string): DemoVariant[] {
  return SIZES.map((s, i) => ({
    id: `${prefix}-${s.toLowerCase()}`,
    title: s,
    options: { size: s },
    inventory_count: Math.floor(Math.random() * 20) + 1,
  }));
}

export const DEMO_HOTZONES: DemoHotzone[] = [
  {
    id: 'hz-outerwear',
    name: 'OUTERWEAR',
    position: { x: 0, y: 0, width: 900, height: 700 },
    style_config: { color: '#ffffff' },
    neighbors: { right: 'hz-streetwear', down: 'hz-essentials' },
  },
  {
    id: 'hz-streetwear',
    name: 'STREETWEAR',
    position: { x: 1000, y: 0, width: 900, height: 700 },
    style_config: { color: '#d4a853' },
    neighbors: { left: 'hz-outerwear', down: 'hz-new-arrivals' },
  },
  {
    id: 'hz-essentials',
    name: 'ESSENTIALS',
    position: { x: 0, y: 800, width: 900, height: 700 },
    style_config: { color: '#888888' },
    neighbors: { up: 'hz-outerwear', right: 'hz-new-arrivals' },
  },
  {
    id: 'hz-new-arrivals',
    name: 'NEW ARRIVALS',
    position: { x: 1000, y: 800, width: 900, height: 700 },
    style_config: { color: '#e8c547' },
    neighbors: { up: 'hz-streetwear', left: 'hz-essentials' },
  },
];

// Tight 6-column grid — no category grouping gaps
const TILE_W = 220;
const TILE_H = 300;
const GAP = 6;
const COLS = 5;
const gridPos = (i: number) => ({
  x: (i % COLS) * (TILE_W + GAP),
  y: Math.floor(i / COLS) * (TILE_H + GAP),
});

export const DEMO_PRODUCTS: DemoProduct[] = [
  // Row 1: Coats & Jackets
  { id: 'p1', title: 'Cloud Puffer Jacket', price: 420, compare_at_price: 520, images: [imgSet('p1-cloud-puffer'), imgSet('p1-cloud-puffer-worn')], category: 'outerwear', product_category: 'jacket', status: 'active', grid_position: gridPos(0), variants: makeVariants('p1'), description: 'Oversized puffer with matte shell. Cloud-weight insulation for sub-zero warmth.', weight_oz: 38, shipping_type: 'domestic' },
  { id: 'p2', title: 'Stealth Trench', price: 380, images: [imgSet('p2-stealth-trench'), imgSet('p2-stealth-trench-worn')], category: 'outerwear', product_category: 'jacket', status: 'active', grid_position: gridPos(1), variants: makeVariants('p2'), description: 'Minimalist trench coat in water-resistant cotton. Hidden snap closures.', weight_oz: 42, shipping_type: 'domestic' },
  { id: 'p7', title: 'Wool Overcoat', price: 550, images: [imgSet('p7-wool-overcoat'), imgSet('p7-wool-overcoat-worn')], category: 'outerwear', product_category: 'jacket', status: 'active', grid_position: gridPos(2), variants: makeVariants('p7'), description: 'Double-faced Italian wool. Unlined for a clean drape.', weight_oz: 48, shipping_type: 'domestic' },
  { id: 'p9', title: 'Leather Moto Jacket', price: 680, images: [imgSet('p9-leather-moto'), imgSet('p9-leather-moto-worn')], category: 'outerwear', product_category: 'jacket', status: 'active', grid_position: gridPos(3), variants: makeVariants('p9'), description: 'Full-grain lambskin with asymmetric zip. Broken in from day one.', weight_oz: 56, shipping_type: 'domestic' },
  { id: 'p3', title: 'Bomber Mk IV', price: 290, images: [imgSet('p3-bomber'), imgSet('p3-bomber-worn')], category: 'outerwear', product_category: 'jacket', status: 'active', grid_position: gridPos(4), variants: makeVariants('p3'), description: 'Technical bomber with ribbed cuffs and exposed zip. Flight-ready.', weight_oz: 28, shipping_type: 'domestic' },
  // Row 2: Light Jackets & Tops
  { id: 'p8', title: 'Windbreaker Shell', price: 195, images: [imgSet('p8-windbreaker'), imgSet('p8-windbreaker-worn')], category: 'outerwear', product_category: 'jacket', status: 'active', grid_position: gridPos(5), variants: makeVariants('p8'), description: 'Packable windbreaker. Reflective tape at seams.', weight_oz: 12, shipping_type: 'domestic' },
  { id: 'p10', title: 'Track Jacket', price: 210, images: [imgSet('p10-track-jacket'), imgSet('p10-track-jacket-worn')], category: 'streetwear', product_category: 'jacket', status: 'active', grid_position: gridPos(6), variants: makeVariants('p10'), description: 'Retro-inspired track jacket with contrast piping.', weight_oz: 18, shipping_type: 'domestic' },
  { id: 'p19', title: 'Deconstructed Blazer', price: 340, images: [imgSet('p19-deconstructed-blazer'), imgSet('p19-deconstructed-blazer-worn')], category: 'new-arrivals', product_category: 'jacket', status: 'active', grid_position: gridPos(7), variants: makeVariants('p19'), description: 'Unstructured blazer with raw edge details.', weight_oz: 22, shipping_type: 'domestic' },
  { id: 'p4', title: 'Graphic Hoodie', price: 145, images: [imgSet('p4-graphic-hoodie'), imgSet('p4-graphic-hoodie-worn')], category: 'streetwear', product_category: 'shirt', status: 'active', grid_position: gridPos(8), variants: makeVariants('p4'), description: 'Heavy fleece hoodie with screen-printed back graphic.', weight_oz: 24, shipping_type: 'domestic' },
  { id: 'p13', title: 'Core Crewneck', price: 95, images: [imgSet('p13-core-crewneck'), imgSet('p13-core-crewneck-worn')], category: 'essentials', product_category: 'shirt', status: 'active', grid_position: gridPos(9), variants: makeVariants('p13'), description: 'Mid-weight french terry crewneck. The foundation.', weight_oz: 16, shipping_type: 'domestic' },
  // Row 3: Shirts & Tops
  { id: 'p20', title: 'Knit Polo', price: 125, images: [imgSet('p20-knit-polo'), imgSet('p20-knit-polo-worn')], category: 'new-arrivals', product_category: 'shirt', status: 'active', grid_position: gridPos(10), variants: makeVariants('p20'), description: 'Textured knit polo. Open collar. Relaxed fit.', weight_oz: 10, shipping_type: 'domestic' },
  { id: 'p18', title: 'Long Sleeve Base', price: 70, images: [imgSet('p18-long-sleeve'), imgSet('p18-long-sleeve-worn')], category: 'essentials', product_category: 'shirt', status: 'active', grid_position: gridPos(11), variants: makeVariants('p18'), description: 'Fitted long sleeve in premium cotton. Layer or wear alone.', weight_oz: 8, shipping_type: 'domestic' },
  { id: 'p6', title: 'Oversized Tee', price: 65, images: [imgSet('p6-oversized-tee'), imgSet('p6-oversized-tee-worn')], category: 'streetwear', product_category: 'shirt', status: 'active', grid_position: gridPos(12), variants: makeVariants('p6'), description: 'Heavyweight cotton. Dropped shoulder. Boxy cut.', weight_oz: 9, shipping_type: 'domestic' },
  { id: 'p15', title: 'Tank Top', price: 40, images: [imgSet('p15-tank-top'), imgSet('p15-tank-top-worn')], category: 'essentials', product_category: 'shirt', status: 'active', grid_position: gridPos(13), variants: makeVariants('p15'), description: 'Ribbed cotton tank. Elongated hem.', weight_oz: 5, shipping_type: 'domestic' },
  { id: 'p12', title: 'Maroon Crop Top', price: 55, images: [imgSet('p12-maroon-crop-top'), imgSet('p12-maroon-crop-top-worn')], category: 'essentials', product_category: 'shirt', status: 'active', grid_position: gridPos(14), variants: makeVariants('p12'), description: 'Fitted maroon crop top in soft stretch cotton. Scoop neck, short sleeves.', weight_oz: 4, shipping_type: 'domestic' },
  // Row 4: Pants, Shorts & Accessories
  { id: 'p5', title: 'Cargo Pants', price: 175, images: [imgSet('p5-cargo-pants'), imgSet('p5-cargo-pants-worn')], category: 'streetwear', product_category: 'pants', status: 'active', grid_position: gridPos(15), variants: makeVariants('p5'), description: 'Relaxed fit cargo with oversized pockets. Ripstop cotton.', weight_oz: 20, shipping_type: 'domestic' },
  { id: 'p16', title: 'Crème Joggers', price: 120, images: [imgSet('p16-creme-joggers'), imgSet('p16-creme-joggers-worn')], category: 'essentials', product_category: 'pants', status: 'active', grid_position: gridPos(16), variants: makeVariants('p16'), description: 'Heavyweight French terry joggers in crème. Elastic waist with drawstring. Ribbed cuffs.', weight_oz: 18, shipping_type: 'domestic' },
  { id: 'p25', title: 'Utility Pant', price: 165, images: [imgSet('p25-utility-pant'), imgSet('p25-utility-pant-worn')], category: 'streetwear', product_category: 'pants', status: 'active', grid_position: gridPos(17), variants: makeVariants('p25'), description: 'Slim tapered utility pant with zippered cargo pockets. Matte black technical fabric.', weight_oz: 16, shipping_type: 'domestic' },
  { id: 'p11', title: 'Mesh Shorts', price: 85, images: [imgSet('p11-mesh-shorts'), imgSet('p11-mesh-shorts-worn')], category: 'streetwear', product_category: 'shorts', status: 'active', grid_position: gridPos(18), variants: makeVariants('p11'), description: 'Double-layer mesh with elastic waist. Practice-ready.', weight_oz: 7, shipping_type: 'domestic' },
  { id: 'p17', title: 'Sweat Shorts', price: 75, images: [imgSet('p17-sweat-shorts'), imgSet('p17-sweat-shorts-worn')], category: 'essentials', product_category: 'shorts', status: 'active', grid_position: gridPos(19), variants: makeVariants('p17'), description: 'French terry shorts with raw hem.', weight_oz: 10, shipping_type: 'domestic' },
  // Row 5: Additional items
  { id: 'p14', title: 'Slim Jogger', price: 130, images: [imgSet('p14-slim-jogger'), imgSet('p14-slim-jogger-worn')], category: 'essentials', product_category: 'pants', status: 'active', grid_position: gridPos(20), variants: makeVariants('p14'), description: 'Tapered slim jogger in brushed fleece. Zip pockets and ribbed ankle cuffs.', weight_oz: 16, shipping_type: 'domestic' },
  { id: 'p21', title: 'Wide Leg Trouser', price: 185, images: [imgSet('p21-wide-leg-trouser'), imgSet('p21-wide-leg-trouser-worn')], category: 'new-arrivals', product_category: 'pants', status: 'active', grid_position: gridPos(21), variants: makeVariants('p21'), description: 'Relaxed wide-leg trouser in structured cotton. Clean front pleat.', weight_oz: 18, shipping_type: 'domestic' },
  { id: 'p22', title: 'Zip Vest', price: 155, images: [imgSet('p22-zip-vest'), imgSet('p22-zip-vest-worn')], category: 'streetwear', product_category: 'jacket', status: 'active', grid_position: gridPos(22), variants: makeVariants('p22'), description: 'Padded zip vest with stand collar. Lightweight warmth without bulk.', weight_oz: 14, shipping_type: 'domestic' },
  { id: 'p23', title: 'Cashmere Beanie', price: 85, images: [imgSet('p23-cashmere-beanie'), imgSet('p23-cashmere-beanie-worn')], category: 'essentials', product_category: 'hat', status: 'active', grid_position: gridPos(23), variants: makeVariants('p23'), description: 'Pure cashmere ribbed beanie. Soft hand-feel, clean silhouette.', weight_oz: 3, shipping_type: 'domestic' },
  { id: 'p24', title: 'Scarf Wrap', price: 110, images: [imgSet('p24-scarf-wrap'), imgSet('p24-scarf-wrap-worn')], category: 'new-arrivals', product_category: 'accessory', status: 'active', grid_position: gridPos(24), variants: makeVariants('p24'), description: 'Oversized wool-blend scarf wrap. Versatile drape, fringed edges.', weight_oz: 6, shipping_type: 'domestic' },
];

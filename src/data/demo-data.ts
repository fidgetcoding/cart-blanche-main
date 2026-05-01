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

export type ProductType = 'shirt' | 'pants' | 'jacket' | 'hat' | 'accessory' | 'shorts' | '';

export const PRODUCT_TYPES: ProductType[] = ['shirt', 'pants', 'jacket', 'shorts', 'hat', 'accessory'];

export interface DemoProduct {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number;
  images: ProductImage[];
  category: string;
  product_type: ProductType;
  gender: string;
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
  { id: 'p1', title: 'Cloud Puffer Jacket', price: 420, compare_at_price: 520, images: [imgSet('p1-cloud-puffer'), imgSet('p1-cloud-puffer-worn')], category: 'outerwear', product_type: 'jacket', status: 'active', grid_position: gridPos(0), variants: makeVariants('p1'), description: 'Oversized puffer with matte shell. Cloud-weight insulation for sub-zero warmth.', weight_oz: 38, shipping_type: 'domestic' },
  { id: 'p2', title: 'Stealth Trench', price: 380, images: [imgSet('p2-stealth-trench'), imgSet('p2-stealth-trench-worn')], category: 'outerwear', product_type: 'jacket', status: 'active', grid_position: gridPos(1), variants: makeVariants('p2'), description: 'Minimalist trench coat in water-resistant cotton. Hidden snap closures.', weight_oz: 42, shipping_type: 'domestic' },
  { id: 'p7', title: 'Wool Overcoat', price: 550, images: [imgSet('p7-wool-overcoat'), imgSet('p7-wool-overcoat-worn')], category: 'outerwear', product_type: 'jacket', status: 'active', grid_position: gridPos(2), variants: makeVariants('p7'), description: 'Double-faced Italian wool. Unlined for a clean drape.', weight_oz: 48, shipping_type: 'domestic' },
  { id: 'p9', title: 'Leather Moto Jacket', price: 680, images: [imgSet('p9-leather-moto'), imgSet('p9-leather-moto-worn')], category: 'outerwear', product_type: 'jacket', status: 'active', grid_position: gridPos(3), variants: makeVariants('p9'), description: 'Full-grain lambskin with asymmetric zip. Broken in from day one.', weight_oz: 56, shipping_type: 'domestic' },
  { id: 'p3', title: 'Bomber Mk IV', price: 290, images: [imgSet('p3-bomber'), imgSet('p3-bomber-worn')], category: 'outerwear', product_type: 'jacket', status: 'active', grid_position: gridPos(4), variants: makeVariants('p3'), description: 'Technical bomber with ribbed cuffs and exposed zip. Flight-ready.', weight_oz: 28, shipping_type: 'domestic' },
  // Row 2: Light Jackets & Tops
  { id: 'p8', title: 'Windbreaker Shell', price: 195, images: [imgSet('p8-windbreaker'), imgSet('p8-windbreaker-worn')], category: 'outerwear', product_type: 'jacket', status: 'active', grid_position: gridPos(5), variants: makeVariants('p8'), description: 'Packable windbreaker. Reflective tape at seams.', weight_oz: 12, shipping_type: 'domestic' },
  { id: 'p10', title: 'Track Jacket', price: 210, images: [imgSet('p10-track-jacket'), imgSet('p10-track-jacket-worn')], category: 'streetwear', product_type: 'jacket', status: 'active', grid_position: gridPos(6), variants: makeVariants('p10'), description: 'Retro-inspired track jacket with contrast piping.', weight_oz: 18, shipping_type: 'domestic' },
  { id: 'p19', title: 'Deconstructed Blazer', price: 340, images: [imgSet('p19-deconstructed-blazer'), imgSet('p19-deconstructed-blazer-worn')], category: 'new-arrivals', product_type: 'jacket', status: 'active', grid_position: gridPos(7), variants: makeVariants('p19'), description: 'Unstructured blazer with raw edge details.', weight_oz: 22, shipping_type: 'domestic' },
  { id: 'p4', title: 'Graphic Hoodie', price: 145, images: [imgSet('p4-graphic-hoodie'), imgSet('p4-graphic-hoodie-worn')], category: 'streetwear', product_type: 'shirt', status: 'active', grid_position: gridPos(8), variants: makeVariants('p4'), description: 'Heavy fleece hoodie with screen-printed back graphic.', weight_oz: 24, shipping_type: 'domestic' },
  { id: 'p13', title: 'Core Crewneck', price: 95, images: [imgSet('p13-core-crewneck'), imgSet('p13-core-crewneck-worn')], category: 'essentials', product_type: 'shirt', status: 'active', grid_position: gridPos(9), variants: makeVariants('p13'), description: 'Mid-weight french terry crewneck. The foundation.', weight_oz: 16, shipping_type: 'domestic' },
  // Row 3: Shirts & Tops
  { id: 'p20', title: 'Knit Polo', price: 125, images: [imgSet('p20-knit-polo'), imgSet('p20-knit-polo-worn')], category: 'new-arrivals', product_type: 'shirt', status: 'active', grid_position: gridPos(10), variants: makeVariants('p20'), description: 'Textured knit polo. Open collar. Relaxed fit.', weight_oz: 10, shipping_type: 'domestic' },
  { id: 'p18', title: 'Long Sleeve Base', price: 70, images: [imgSet('p18-long-sleeve'), imgSet('p18-long-sleeve-worn')], category: 'essentials', product_type: 'shirt', status: 'active', grid_position: gridPos(11), variants: makeVariants('p18'), description: 'Fitted long sleeve in premium cotton. Layer or wear alone.', weight_oz: 8, shipping_type: 'domestic' },
  { id: 'p6', title: 'Oversized Tee', price: 65, images: [imgSet('p6-oversized-tee'), imgSet('p6-oversized-tee-worn')], category: 'streetwear', product_type: 'shirt', status: 'active', grid_position: gridPos(12), variants: makeVariants('p6'), description: 'Heavyweight cotton. Dropped shoulder. Boxy cut.', weight_oz: 9, shipping_type: 'domestic' },
  { id: 'p15', title: 'Tank Top', price: 40, images: [imgSet('p15-tank-top'), imgSet('p15-tank-top-worn')], category: 'essentials', product_type: 'shirt', status: 'active', grid_position: gridPos(13), variants: makeVariants('p15'), description: 'Ribbed cotton tank. Elongated hem.', weight_oz: 5, shipping_type: 'domestic' },
  { id: 'p12', title: 'Maroon Crop Top', price: 55, images: [imgSet('p12-maroon-crop-top'), imgSet('p12-maroon-crop-top-worn')], category: 'essentials', product_type: 'shirt', status: 'active', grid_position: gridPos(14), variants: makeVariants('p12'), description: 'Fitted maroon crop top in soft stretch cotton. Scoop neck, short sleeves.', weight_oz: 4, shipping_type: 'domestic' },
  // Row 4: Pants, Shorts & Accessories
  { id: 'p5', title: 'Cargo Pants', price: 175, images: [imgSet('p5-cargo-pants'), imgSet('p5-cargo-pants-worn')], category: 'streetwear', product_type: 'pants', status: 'active', grid_position: gridPos(15), variants: makeVariants('p5'), description: 'Relaxed fit cargo with oversized pockets. Ripstop cotton.', weight_oz: 20, shipping_type: 'domestic' },
  { id: 'p16', title: 'Crème Joggers', price: 120, images: [imgSet('p16-creme-joggers'), imgSet('p16-creme-joggers-worn')], category: 'essentials', product_type: 'pants', status: 'active', grid_position: gridPos(16), variants: makeVariants('p16'), description: 'Heavyweight French terry joggers in crème. Elastic waist with drawstring. Ribbed cuffs.', weight_oz: 18, shipping_type: 'domestic' },
  { id: 'p25', title: 'Utility Pant', price: 165, images: [imgSet('p25-utility-pant'), imgSet('p25-utility-pant-worn')], category: 'streetwear', product_type: 'pants', status: 'active', grid_position: gridPos(17), variants: makeVariants('p25'), description: 'Slim tapered utility pant with zippered cargo pockets. Matte black technical fabric.', weight_oz: 16, shipping_type: 'domestic' },
  { id: 'p11', title: 'Mesh Shorts', price: 85, images: [imgSet('p11-mesh-shorts'), imgSet('p11-mesh-shorts-worn')], category: 'streetwear', product_type: 'shorts', status: 'active', grid_position: gridPos(18), variants: makeVariants('p11'), description: 'Double-layer mesh with elastic waist. Practice-ready.', weight_oz: 7, shipping_type: 'domestic' },
  { id: 'p17', title: 'Sweat Shorts', price: 75, images: [imgSet('p17-sweat-shorts'), imgSet('p17-sweat-shorts-worn')], category: 'essentials', product_type: 'shorts', status: 'active', grid_position: gridPos(19), variants: makeVariants('p17'), description: 'French terry shorts with raw hem.', weight_oz: 10, shipping_type: 'domestic' },
  // Page 2 duplicates for pagination testing
  { id: 'p1b', title: 'Cloud Puffer Jacket II', price: 440, compare_at_price: 520, images: [imgSet('p1-cloud-puffer'), imgSet('p1-cloud-puffer-worn')], category: 'outerwear', product_type: 'jacket', status: 'active', grid_position: gridPos(20), variants: makeVariants('p1b'), description: 'Second-generation puffer with updated insulation.', weight_oz: 38, shipping_type: 'domestic' },
  { id: 'p2b', title: 'Stealth Trench II', price: 395, images: [imgSet('p2-stealth-trench'), imgSet('p2-stealth-trench-worn')], category: 'outerwear', product_type: 'jacket', status: 'active', grid_position: gridPos(21), variants: makeVariants('p2b'), description: 'Updated trench with improved water resistance.', weight_oz: 42, shipping_type: 'domestic' },
  { id: 'p7b', title: 'Wool Overcoat II', price: 575, images: [imgSet('p7-wool-overcoat'), imgSet('p7-wool-overcoat-worn')], category: 'outerwear', product_type: 'jacket', status: 'active', grid_position: gridPos(22), variants: makeVariants('p7b'), description: 'Refined overcoat with updated drape and finish.', weight_oz: 48, shipping_type: 'domestic' },
  { id: 'p9b', title: 'Leather Moto Jacket II', price: 710, images: [imgSet('p9-leather-moto'), imgSet('p9-leather-moto-worn')], category: 'outerwear', product_type: 'jacket', status: 'active', grid_position: gridPos(23), variants: makeVariants('p9b'), description: 'Updated moto with softer lambskin and revised zip.', weight_oz: 56, shipping_type: 'domestic' },
  { id: 'p3b', title: 'Bomber Mk V', price: 310, images: [imgSet('p3-bomber'), imgSet('p3-bomber-worn')], category: 'outerwear', product_type: 'jacket', status: 'active', grid_position: gridPos(24), variants: makeVariants('p3b'), description: 'Next-gen bomber with improved ribbing.', weight_oz: 28, shipping_type: 'domestic' },
  { id: 'p8b', title: 'Windbreaker Shell II', price: 210, images: [imgSet('p8-windbreaker'), imgSet('p8-windbreaker-worn')], category: 'outerwear', product_type: 'jacket', status: 'active', grid_position: gridPos(25), variants: makeVariants('p8b'), description: 'Updated packable shell with enhanced reflective tape.', weight_oz: 12, shipping_type: 'domestic' },
  { id: 'p10b', title: 'Track Jacket II', price: 225, images: [imgSet('p10-track-jacket'), imgSet('p10-track-jacket-worn')], category: 'streetwear', product_type: 'jacket', status: 'active', grid_position: gridPos(26), variants: makeVariants('p10b'), description: 'Updated track jacket with tonal piping.', weight_oz: 18, shipping_type: 'domestic' },
  { id: 'p19b', title: 'Deconstructed Blazer II', price: 360, images: [imgSet('p19-deconstructed-blazer'), imgSet('p19-deconstructed-blazer-worn')], category: 'new-arrivals', product_type: 'jacket', status: 'active', grid_position: gridPos(27), variants: makeVariants('p19b'), description: 'Revised unstructured blazer with refined raw edges.', weight_oz: 22, shipping_type: 'domestic' },
  { id: 'p4b', title: 'Graphic Hoodie II', price: 155, images: [imgSet('p4-graphic-hoodie'), imgSet('p4-graphic-hoodie-worn')], category: 'streetwear', product_type: 'shirt', status: 'active', grid_position: gridPos(28), variants: makeVariants('p4b'), description: 'Heavy fleece hoodie with new back graphic.', weight_oz: 24, shipping_type: 'domestic' },
  { id: 'p13b', title: 'Core Crewneck II', price: 105, images: [imgSet('p13-core-crewneck'), imgSet('p13-core-crewneck-worn')], category: 'essentials', product_type: 'shirt', status: 'active', grid_position: gridPos(29), variants: makeVariants('p13b'), description: 'Updated mid-weight crewneck with improved fit.', weight_oz: 16, shipping_type: 'domestic' },
  { id: 'p20b', title: 'Knit Polo II', price: 135, images: [imgSet('p20-knit-polo'), imgSet('p20-knit-polo-worn')], category: 'new-arrivals', product_type: 'shirt', status: 'active', grid_position: gridPos(30), variants: makeVariants('p20b'), description: 'Refined textured knit polo with updated collar.', weight_oz: 10, shipping_type: 'domestic' },
  { id: 'p18b', title: 'Long Sleeve Base II', price: 80, images: [imgSet('p18-long-sleeve'), imgSet('p18-long-sleeve-worn')], category: 'essentials', product_type: 'shirt', status: 'active', grid_position: gridPos(31), variants: makeVariants('p18b'), description: 'Updated fitted long sleeve in premium cotton.', weight_oz: 8, shipping_type: 'domestic' },
  { id: 'p6b', title: 'Oversized Tee II', price: 70, images: [imgSet('p6-oversized-tee'), imgSet('p6-oversized-tee-worn')], category: 'streetwear', product_type: 'shirt', status: 'active', grid_position: gridPos(32), variants: makeVariants('p6b'), description: 'Heavyweight cotton tee with revised boxy cut.', weight_oz: 9, shipping_type: 'domestic' },
  { id: 'p15b', title: 'Tank Top II', price: 45, images: [imgSet('p15-tank-top'), imgSet('p15-tank-top-worn')], category: 'essentials', product_type: 'shirt', status: 'active', grid_position: gridPos(33), variants: makeVariants('p15b'), description: 'Updated ribbed cotton tank with extended hem.', weight_oz: 5, shipping_type: 'domestic' },
  { id: 'p12b', title: 'Maroon Crop Top II', price: 60, images: [imgSet('p12-maroon-crop-top'), imgSet('p12-maroon-crop-top-worn')], category: 'essentials', product_type: 'shirt', status: 'active', grid_position: gridPos(34), variants: makeVariants('p12b'), description: 'Updated fitted crop top in deeper maroon.', weight_oz: 4, shipping_type: 'domestic' },
  { id: 'p5b', title: 'Cargo Pants II', price: 185, images: [imgSet('p5-cargo-pants'), imgSet('p5-cargo-pants-worn')], category: 'streetwear', product_type: 'pants', status: 'active', grid_position: gridPos(35), variants: makeVariants('p5b'), description: 'Updated relaxed cargo with refined pocket placement.', weight_oz: 20, shipping_type: 'domestic' },
  { id: 'p16b', title: 'Crème Joggers II', price: 130, images: [imgSet('p16-creme-joggers'), imgSet('p16-creme-joggers-worn')], category: 'essentials', product_type: 'pants', status: 'active', grid_position: gridPos(36), variants: makeVariants('p16b'), description: 'Updated heavyweight joggers with improved cuffs.', weight_oz: 18, shipping_type: 'domestic' },
  { id: 'p25b', title: 'Utility Pant II', price: 175, images: [imgSet('p25-utility-pant'), imgSet('p25-utility-pant-worn')], category: 'streetwear', product_type: 'pants', status: 'active', grid_position: gridPos(37), variants: makeVariants('p25b'), description: 'Updated slim tapered utility pant with revised zips.', weight_oz: 16, shipping_type: 'domestic' },
  { id: 'p11b', title: 'Mesh Shorts II', price: 90, images: [imgSet('p11-mesh-shorts'), imgSet('p11-mesh-shorts-worn')], category: 'streetwear', product_type: 'shorts', status: 'active', grid_position: gridPos(38), variants: makeVariants('p11b'), description: 'Updated double-layer mesh with improved elastic.', weight_oz: 7, shipping_type: 'domestic' },
  { id: 'p17b', title: 'Sweat Shorts II', price: 80, images: [imgSet('p17-sweat-shorts'), imgSet('p17-sweat-shorts-worn')], category: 'essentials', product_type: 'shorts', status: 'active', grid_position: gridPos(39), variants: makeVariants('p17b'), description: 'Updated French terry shorts with cleaner raw hem.', weight_oz: 10, shipping_type: 'domestic' },
];

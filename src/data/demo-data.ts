// Demo seed data for the spatial storefront
import imgP1 from '@/assets/products/p1-cloud-puffer.jpg';
import imgP2 from '@/assets/products/p2-stealth-trench.jpg';
import imgP3 from '@/assets/products/p3-bomber.jpg';
import imgP4 from '@/assets/products/p4-graphic-hoodie.jpg';
import imgP5 from '@/assets/products/p5-cargo-pants.jpg';
import imgP6 from '@/assets/products/p6-oversized-tee.jpg';
import imgP7 from '@/assets/products/p7-wool-overcoat.jpg';
import imgP8 from '@/assets/products/p8-windbreaker.jpg';
import imgP9 from '@/assets/products/p9-leather-moto.jpg';
import imgP10 from '@/assets/products/p10-track-jacket.jpg';
import imgP11 from '@/assets/products/p11-mesh-shorts.jpg';
import imgP12 from '@/assets/products/p12-logo-cap.jpg';
import imgP13 from '@/assets/products/p13-core-crewneck.jpg';
import imgP15 from '@/assets/products/p15-tank-top.jpg';
import imgP16 from '@/assets/products/p16-basic-tee-3pack.jpg';
import imgP17 from '@/assets/products/p17-sweat-shorts.jpg';
import imgP18 from '@/assets/products/p18-long-sleeve.jpg';
import imgP19 from '@/assets/products/p19-deconstructed-blazer.jpg';
import imgP20 from '@/assets/products/p20-knit-polo.jpg';
import imgP25 from '@/assets/products/p25-utility-pant.jpg';
import imgP1Worn from '@/assets/products/p1-cloud-puffer-worn.jpg';
import imgP2Worn from '@/assets/products/p2-stealth-trench-worn.jpg';
import imgP3Worn from '@/assets/products/p3-bomber-worn.jpg';
import imgP4Worn from '@/assets/products/p4-graphic-hoodie-worn.jpg';
import imgP5Worn from '@/assets/products/p5-cargo-pants-worn.jpg';
import imgP6Worn from '@/assets/products/p6-oversized-tee-worn.jpg';
import imgP7Worn from '@/assets/products/p7-wool-overcoat-worn.jpg';
import imgP8Worn from '@/assets/products/p8-windbreaker-worn.jpg';
import imgP9Worn from '@/assets/products/p9-leather-moto-worn.jpg';
import imgP10Worn from '@/assets/products/p10-track-jacket-worn.jpg';
import imgP11Worn from '@/assets/products/p11-mesh-shorts-worn.jpg';
import imgP12Worn from '@/assets/products/p12-logo-cap-worn.jpg';
import imgP13Worn from '@/assets/products/p13-core-crewneck-worn.jpg';
import imgP15Worn from '@/assets/products/p15-tank-top-worn.jpg';
import imgP16Worn from '@/assets/products/p16-basic-tee-worn.jpg';
import imgP17Worn from '@/assets/products/p17-sweat-shorts-worn.jpg';
import imgP18Worn from '@/assets/products/p18-long-sleeve-worn.jpg';
import imgP19Worn from '@/assets/products/p19-deconstructed-blazer-worn.jpg';
import imgP20Worn from '@/assets/products/p20-knit-polo-worn.jpg';
import imgP25Worn from '@/assets/products/p25-utility-pant-worn.jpg';

export type ProductCategory = 'shirt' | 'pants' | 'jacket' | 'hat' | 'accessory' | 'shorts' | '';

export const PRODUCT_CATEGORIES: ProductCategory[] = ['shirt', 'pants', 'jacket', 'shorts', 'hat', 'accessory'];

export interface DemoProduct {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number;
  images: string[];
  category: string;
  product_category: ProductCategory;
  status: 'active';
  grid_position: { x: number; y: number };
  variants: DemoVariant[];
  description: string;
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
  { id: 'p1', title: 'Cloud Puffer Jacket', price: 420, compare_at_price: 520, images: [imgP1, imgP1Worn], category: 'outerwear', product_category: 'jacket', status: 'active', grid_position: gridPos(0), variants: makeVariants('p1'), description: 'Oversized puffer with matte shell. Cloud-weight insulation for sub-zero warmth.' },
  { id: 'p2', title: 'Stealth Trench', price: 380, images: [imgP2, imgP2Worn], category: 'outerwear', product_category: 'jacket', status: 'active', grid_position: gridPos(1), variants: makeVariants('p2'), description: 'Minimalist trench coat in water-resistant cotton. Hidden snap closures.' },
  { id: 'p7', title: 'Wool Overcoat', price: 550, images: [imgP7, imgP7Worn], category: 'outerwear', product_category: 'jacket', status: 'active', grid_position: gridPos(2), variants: makeVariants('p7'), description: 'Double-faced Italian wool. Unlined for a clean drape.' },
  { id: 'p9', title: 'Leather Moto Jacket', price: 680, images: [imgP9, imgP9Worn], category: 'outerwear', product_category: 'jacket', status: 'active', grid_position: gridPos(3), variants: makeVariants('p9'), description: 'Full-grain lambskin with asymmetric zip. Broken in from day one.' },
  { id: 'p3', title: 'Bomber Mk IV', price: 290, images: [imgP3, imgP3Worn], category: 'outerwear', product_category: 'jacket', status: 'active', grid_position: gridPos(4), variants: makeVariants('p3'), description: 'Technical bomber with ribbed cuffs and exposed zip. Flight-ready.' },
  // Row 2: Light Jackets & Tops
  { id: 'p8', title: 'Windbreaker Shell', price: 195, images: [imgP8, imgP8Worn], category: 'outerwear', product_category: 'jacket', status: 'active', grid_position: gridPos(5), variants: makeVariants('p8'), description: 'Packable windbreaker. Reflective tape at seams.' },
  { id: 'p10', title: 'Track Jacket', price: 210, images: [imgP10, imgP10Worn], category: 'streetwear', product_category: 'jacket', status: 'active', grid_position: gridPos(6), variants: makeVariants('p10'), description: 'Retro-inspired track jacket with contrast piping.' },
  { id: 'p19', title: 'Deconstructed Blazer', price: 340, images: [imgP19, imgP19Worn], category: 'new-arrivals', product_category: 'jacket', status: 'active', grid_position: gridPos(7), variants: makeVariants('p19'), description: 'Unstructured blazer with raw edge details.' },
  { id: 'p4', title: 'Graphic Hoodie', price: 145, images: [imgP4, imgP4Worn], category: 'streetwear', product_category: 'shirt', status: 'active', grid_position: gridPos(8), variants: makeVariants('p4'), description: 'Heavy fleece hoodie with screen-printed back graphic.' },
  { id: 'p13', title: 'Core Crewneck', price: 95, images: [imgP13, imgP13Worn], category: 'essentials', product_category: 'shirt', status: 'active', grid_position: gridPos(9), variants: makeVariants('p13'), description: 'Mid-weight french terry crewneck. The foundation.' },
  // Row 3: Shirts & Tops
  { id: 'p20', title: 'Knit Polo', price: 125, images: [imgP20, imgP20Worn], category: 'new-arrivals', product_category: 'shirt', status: 'active', grid_position: gridPos(10), variants: makeVariants('p20'), description: 'Textured knit polo. Open collar. Relaxed fit.' },
  { id: 'p18', title: 'Long Sleeve Base', price: 70, images: [imgP18, imgP18Worn], category: 'essentials', product_category: 'shirt', status: 'active', grid_position: gridPos(11), variants: makeVariants('p18'), description: 'Fitted long sleeve in premium cotton. Layer or wear alone.' },
  { id: 'p6', title: 'Oversized Tee', price: 65, images: [imgP6, imgP6Worn], category: 'streetwear', product_category: 'shirt', status: 'active', grid_position: gridPos(12), variants: makeVariants('p6'), description: 'Heavyweight cotton. Dropped shoulder. Boxy cut.' },
  { id: 'p15', title: 'Tank Top', price: 40, images: [imgP15, imgP15Worn], category: 'essentials', product_category: 'shirt', status: 'active', grid_position: gridPos(13), variants: makeVariants('p15'), description: 'Ribbed cotton tank. Elongated hem.' },
  { id: 'p12', title: 'Maroon Crop Top', price: 55, images: [imgP12, imgP12Worn], category: 'essentials', product_category: 'shirt', status: 'active', grid_position: gridPos(14), variants: makeVariants('p12'), description: 'Fitted maroon crop top in soft stretch cotton. Scoop neck, short sleeves.' },
  // Row 4: Pants, Shorts & Accessories
  { id: 'p5', title: 'Cargo Pants', price: 175, images: [imgP5, imgP5Worn], category: 'streetwear', product_category: 'pants', status: 'active', grid_position: gridPos(15), variants: makeVariants('p5'), description: 'Relaxed fit cargo with oversized pockets. Ripstop cotton.' },
  { id: 'p16', title: 'Crème Joggers', price: 120, images: [imgP16, imgP16Worn], category: 'essentials', product_category: 'pants', status: 'active', grid_position: gridPos(16), variants: makeVariants('p16'), description: 'Heavyweight French terry joggers in crème. Elastic waist with drawstring. Ribbed cuffs.' },
  { id: 'p25', title: 'Utility Pant', price: 165, images: [imgP25, imgP25Worn], category: 'streetwear', product_category: 'pants', status: 'active', grid_position: gridPos(17), variants: makeVariants('p25'), description: 'Slim tapered utility pant with zippered cargo pockets. Matte black technical fabric.' },
  { id: 'p11', title: 'Mesh Shorts', price: 85, images: [imgP11, imgP11Worn], category: 'streetwear', product_category: 'shorts', status: 'active', grid_position: gridPos(18), variants: makeVariants('p11'), description: 'Double-layer mesh with elastic waist. Practice-ready.' },
  { id: 'p17', title: 'Sweat Shorts', price: 75, images: [imgP17, imgP17Worn], category: 'essentials', product_category: 'shorts', status: 'active', grid_position: gridPos(19), variants: makeVariants('p17'), description: 'French terry shorts with raw hem.' },
];

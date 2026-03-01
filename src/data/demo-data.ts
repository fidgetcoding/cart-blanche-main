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
import imgP14 from '@/assets/products/p14-slim-jogger.jpg';
import imgP15 from '@/assets/products/p15-tank-top.jpg';
import imgP16 from '@/assets/products/p16-basic-tee-3pack.jpg';
import imgP17 from '@/assets/products/p17-sweat-shorts.jpg';
import imgP18 from '@/assets/products/p18-long-sleeve.jpg';
import imgP19 from '@/assets/products/p19-deconstructed-blazer.jpg';
import imgP20 from '@/assets/products/p20-knit-polo.jpg';
import imgP21 from '@/assets/products/p21-wide-leg-trouser.jpg';
import imgP22 from '@/assets/products/p22-zip-vest.jpg';
import imgP23 from '@/assets/products/p23-cashmere-beanie.jpg';
import imgP24 from '@/assets/products/p24-scarf-wrap.jpg';
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
import imgP14Worn from '@/assets/products/p14-slim-jogger-worn.jpg';
import imgP15Worn from '@/assets/products/p15-tank-top-worn.jpg';
import imgP16Worn from '@/assets/products/p16-basic-tee-worn.jpg';
import imgP17Worn from '@/assets/products/p17-sweat-shorts-worn.jpg';
import imgP18Worn from '@/assets/products/p18-long-sleeve-worn.jpg';
import imgP19Worn from '@/assets/products/p19-deconstructed-blazer-worn.jpg';
import imgP20Worn from '@/assets/products/p20-knit-polo-worn.jpg';
import imgP21Worn from '@/assets/products/p21-wide-leg-trouser-worn.jpg';
import imgP22Worn from '@/assets/products/p22-zip-vest-worn.jpg';
import imgP23Worn from '@/assets/products/p23-cashmere-beanie-worn.jpg';
import imgP24Worn from '@/assets/products/p24-scarf-wrap-worn.jpg';

export interface DemoProduct {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number;
  images: string[];
  category: string;
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
const COLS = 6;
const gridPos = (i: number) => ({
  x: (i % COLS) * (TILE_W + GAP),
  y: Math.floor(i / COLS) * (TILE_H + GAP),
});

export const DEMO_PRODUCTS: DemoProduct[] = [
  { id: 'p1', title: 'Cloud Puffer Jacket', price: 420, compare_at_price: 520, images: [imgP1, imgP1Worn], category: 'outerwear', status: 'active', grid_position: gridPos(0), variants: makeVariants('p1'), description: 'Oversized puffer with matte shell. Cloud-weight insulation for sub-zero warmth.' },
  { id: 'p2', title: 'Stealth Trench', price: 380, images: [imgP2, imgP2Worn], category: 'outerwear', status: 'active', grid_position: gridPos(1), variants: makeVariants('p2'), description: 'Minimalist trench coat in water-resistant cotton. Hidden snap closures.' },
  { id: 'p3', title: 'Bomber Mk IV', price: 290, images: [imgP3, imgP3Worn], category: 'outerwear', status: 'active', grid_position: gridPos(2), variants: makeVariants('p3'), description: 'Technical bomber with ribbed cuffs and exposed zip. Flight-ready.' },
  { id: 'p4', title: 'Graphic Hoodie', price: 145, images: [imgP4, imgP4Worn], category: 'streetwear', status: 'active', grid_position: gridPos(3), variants: makeVariants('p4'), description: 'Heavy fleece hoodie with screen-printed back graphic.' },
  { id: 'p5', title: 'Cargo Pants', price: 175, images: [imgP5, imgP5Worn], category: 'streetwear', status: 'active', grid_position: gridPos(4), variants: makeVariants('p5'), description: 'Relaxed fit cargo with oversized pockets. Ripstop cotton.' },
  { id: 'p6', title: 'Oversized Tee', price: 65, images: [imgP6, imgP6Worn], category: 'streetwear', status: 'active', grid_position: gridPos(5), variants: makeVariants('p6'), description: 'Heavyweight cotton. Dropped shoulder. Boxy cut.' },
  { id: 'p7', title: 'Wool Overcoat', price: 550, images: [imgP7, imgP7Worn], category: 'outerwear', status: 'active', grid_position: gridPos(6), variants: makeVariants('p7'), description: 'Double-faced Italian wool. Unlined for a clean drape.' },
  { id: 'p8', title: 'Windbreaker Shell', price: 195, images: [imgP8, imgP8Worn], category: 'outerwear', status: 'active', grid_position: gridPos(7), variants: makeVariants('p8'), description: 'Packable windbreaker. Reflective tape at seams.' },
  { id: 'p9', title: 'Leather Moto Jacket', price: 680, images: [imgP9, imgP9Worn], category: 'outerwear', status: 'active', grid_position: gridPos(8), variants: makeVariants('p9'), description: 'Full-grain lambskin with asymmetric zip. Broken in from day one.' },
  { id: 'p10', title: 'Track Jacket', price: 210, images: [imgP10, imgP10Worn], category: 'streetwear', status: 'active', grid_position: gridPos(9), variants: makeVariants('p10'), description: 'Retro-inspired track jacket with contrast piping.' },
  { id: 'p11', title: 'Mesh Shorts', price: 85, images: [imgP11, imgP11Worn], category: 'streetwear', status: 'active', grid_position: gridPos(10), variants: makeVariants('p11'), description: 'Double-layer mesh with elastic waist. Practice-ready.' },
  { id: 'p12', title: 'Logo Cap', price: 45, images: [imgP12, imgP12Worn], category: 'streetwear', status: 'active', grid_position: gridPos(11), variants: [{ id: 'p12-os', title: 'One Size', options: { size: 'OS' }, inventory_count: 30 }], description: 'Washed cotton dad cap with embroidered logo.' },
  { id: 'p13', title: 'Core Crewneck', price: 95, images: [imgP13, imgP13Worn], category: 'essentials', status: 'active', grid_position: gridPos(12), variants: makeVariants('p13'), description: 'Mid-weight french terry crewneck. The foundation.' },
  { id: 'p14', title: 'Slim Jogger', price: 120, images: [imgP14, imgP14Worn], category: 'essentials', status: 'active', grid_position: gridPos(13), variants: makeVariants('p14'), description: 'Tapered jogger with zip pockets. Brushed fleece interior.' },
  { id: 'p15', title: 'Tank Top', price: 40, images: [imgP15, imgP15Worn], category: 'essentials', status: 'active', grid_position: gridPos(14), variants: makeVariants('p15'), description: 'Ribbed cotton tank. Elongated hem.' },
  { id: 'p16', title: 'Basic Tee 3-Pack', price: 110, images: [imgP16, imgP16Worn], category: 'essentials', status: 'active', grid_position: gridPos(15), variants: makeVariants('p16'), description: 'Three essential tees in black, white, and grey.' },
  { id: 'p17', title: 'Sweat Shorts', price: 75, images: [imgP17, imgP17Worn], category: 'essentials', status: 'active', grid_position: gridPos(16), variants: makeVariants('p17'), description: 'French terry shorts with raw hem.' },
  { id: 'p18', title: 'Long Sleeve Base', price: 70, images: [imgP18, imgP18Worn], category: 'essentials', status: 'active', grid_position: gridPos(17), variants: makeVariants('p18'), description: 'Fitted long sleeve in premium cotton. Layer or wear alone.' },
  { id: 'p19', title: 'Deconstructed Blazer', price: 340, images: [imgP19, imgP19Worn], category: 'new-arrivals', status: 'active', grid_position: gridPos(18), variants: makeVariants('p19'), description: 'Unstructured blazer with raw edge details.' },
  { id: 'p20', title: 'Knit Polo', price: 125, images: [imgP20, imgP20Worn], category: 'new-arrivals', status: 'active', grid_position: gridPos(19), variants: makeVariants('p20'), description: 'Textured knit polo. Open collar. Relaxed fit.' },
  { id: 'p21', title: 'Wide Leg Trouser', price: 195, images: [imgP21, imgP21Worn], category: 'new-arrivals', status: 'active', grid_position: gridPos(20), variants: makeVariants('p21'), description: 'High-waisted wide leg in crisp wool blend.' },
  { id: 'p22', title: 'Zip Vest', price: 155, images: [imgP22, imgP22Worn], category: 'new-arrivals', status: 'active', grid_position: gridPos(21), variants: makeVariants('p22'), description: 'Quilted vest with hidden zip. Technical warmth.' },
  { id: 'p23', title: 'Cashmere Beanie', price: 85, images: [imgP23, imgP23Worn], category: 'new-arrivals', status: 'active', grid_position: gridPos(22), variants: [{ id: 'p23-os', title: 'One Size', options: { size: 'OS' }, inventory_count: 25 }], description: '100% cashmere ribbed beanie. Exceptionally soft.' },
  { id: 'p24', title: 'Scarf Wrap', price: 110, images: [imgP24, imgP24Worn], category: 'new-arrivals', status: 'active', grid_position: gridPos(23), variants: [{ id: 'p24-os', title: 'One Size', options: { size: 'OS' }, inventory_count: 15 }], description: 'Oversized merino scarf. Can be worn as shawl or wrap.' },
];

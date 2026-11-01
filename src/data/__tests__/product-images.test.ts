import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEMO_PRODUCTS } from '../demo-data';

const PUBLIC_DIR = join(process.cwd(), 'public');
const PRODUCTS_DIR = join(PUBLIC_DIR, 'products');

function isWebP(file: Buffer): boolean {
  return file.subarray(0, 4).toString('latin1') === 'RIFF' && file.subarray(8, 12).toString('latin1') === 'WEBP';
}

describe('bundled product images', () => {
  it('holds real WebP data in every .webp file', () => {
    const bad = readdirSync(PRODUCTS_DIR)
      .filter(name => name.endsWith('.webp'))
      .filter(name => !isWebP(readFileSync(join(PRODUCTS_DIR, name))));
    expect(bad).toEqual([]);
  });

  it('has a working file behind every image the catalogue uses', () => {
    const missing: string[] = [];
    for (const product of DEMO_PRODUCTS) {
      for (const image of product.images) {
        for (const url of [image.thumb, image.medium, image.full]) {
          try {
            if (!isWebP(readFileSync(join(PUBLIC_DIR, url)))) missing.push(url);
          } catch {
            missing.push(url);
          }
        }
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });
});

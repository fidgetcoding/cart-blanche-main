// The garments the carousel carries: the store's first page (PAGE1, the SmartShop grid's twenty pieces, in its
// order) as cut-outs. Names and prices are the store's.
import { PAGE1, money } from '../lib/core';

export interface Look {
  id: string;
  src: string;
  thumb: string;
  name: string;
  price: string;
}

export const PRODUCTS: Look[] = PAGE1.map(p => ({
  id: p.id,
  src: p.images[0].medium,
  thumb: p.images[0].thumb,
  name: p.title,
  price: `$${money(p.price)}`,
}));

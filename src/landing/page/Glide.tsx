// E3 · Glide. The overview shows twice, at the start and the end. Between features the lens pulls back just
// enough to frame the next screen beside this one and glides across, like dragging the store canvas.
// Tags ride on the UI itself. Hero: the copy over the live store, which carries on behind it.
// Final pick, the shipping landing (light first): the bar's right corner is always a softly pulsing Enter the
// demo (no cart, no Smart Portal, no DEMO STOREFRONT label), the hero has no CTA of its own, and the opening
// scrolls itself to SmartShop until the visitor touches anything.
import type { LabOptionProps } from '../types';
import { LensPage } from './parts/page';

export default function E3(props: LabOptionProps) {
  return <LensPage {...props} />;
}

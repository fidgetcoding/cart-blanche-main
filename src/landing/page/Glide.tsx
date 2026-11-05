// E3 · Glide, up to the zoom: the story opens on the whole sheet of screens and the camera zooms into SmartShop.
// From there it is C2, the right rail mirrored: the window holds still and becomes each feature, the rail on the
// left lights the tag the window is acting out. Hero: the headline over the live store, which drifts behind it.
// The shipping landing (light first): the bar's right corner is always a softly pulsing Enter the demo (no cart,
// no SmartPortal icon, no DEMO STOREFRONT label), the hero has no CTA of its own, and the opening scrolls itself
// to SmartShop until the visitor touches anything.
import type { LabOptionProps } from '../types';
import { LensPage } from './parts/page';

export default function E3(props: LabOptionProps) {
  return <LensPage {...props} />;
}

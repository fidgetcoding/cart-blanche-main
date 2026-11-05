// Round 4 copy: the approved round 3 copy cut down hard after Nate's note that r3 was
// "overly complex and quite text heavy". The UI does the explaining; text is heads and labels.
// The landing copy, approved by Nate (round 4 of the design lab). Use it word for word.
export const COPY = {
  demo: { href: '/demo', hrefAdmin: '/demo/admin', cta: 'Enter the demo', under: 'No login needed' },
  hero: {
    eyebrow: 'Invite only · for boutique fashion brands',
    headline: 'Fashion commerce with AI on both sides of the counter.',
    scrollCue: 'Scroll to explore',
  },
  problem: {
    head: 'Every store looks the same. Every back office needs a hire.',
    question: 'Why hire a store manager for a store you know better than anyone?',
  },
  system: {
    head: 'The store, the stylist and the back office. One system.',
    parts: [
      { name: 'SmartShop', role: 'what shoppers see' },
      { name: 'SmartCart', role: 'who helps them buy' },
      { name: 'Smart Portal', role: 'where you run it' },
    ],
  },
  // Each feature: one head plus short labels. The labels caption the UI; they are not sentences.
  features: [
    { id: 'smartshop', label: 'SmartShop', head: 'The storefront is a canvas.', tags: ['Zoom out', 'Drag', 'Step in', 'Size waitlists'] },
    { id: 'buildaset', label: 'Build a Set', head: 'You draw the looks. Shoppers buy the set.', tags: ['Look Book', 'One tap sets'] },
    { id: 'smartcart', label: 'SmartCart', head: 'A stylist in the cart.', tags: ['Knows your stock', 'Builds outfits', 'Fits a budget', 'Reads photos'] },
    { id: 'portal', label: 'Smart Portal', head: 'The back office, minus the hire.', tags: ['Dashboard', 'Inventory', 'Orders', 'Waitlists', 'Grid Editor'] },
    { id: 'manager', label: 'AI Manager', head: 'It drafts the work. You confirm it.', tags: ['On every page', 'Confirm to apply'] },
    { id: 'lab', label: 'Template Lab', head: 'Where your store’s next look gets built.', tags: ['YZ', 'SL'], coming: { label: 'Coming to the Lab', items: ['Editorial spreads', 'Single product stages', 'Spatial rooms', 'House grids'] } },
  ],
  compare: {
    head: 'One system beats a stack of apps.',
    rows: [
      ['Same grid as everyone', 'A canvas for your collection'],
      ['A chat widget', 'A stylist that knows your stock'],
      ['A stack of apps', 'Built in'],
      ['A hired manager', 'An AI that drafts the work'],
    ],
  },
  close: {
    invite: 'Invite only, for premier boutique fashion brands.',
    footer: { credit: 'Built by Nate Davidovich', code: 'GitHub', codeHref: 'https://github.com/fidgetcoding/cart-blanche-main' },
  },
  shots: { mobileYZ: '/landing/storefront-mobile-yz.png', mobileSL: '/landing/storefront-mobile-sl.png' },
} as const;

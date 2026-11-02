# Cart Blanche, on one page

**Try it live, no login: <https://cart-blanche-main.vercel.app>** (store portal at [/admin](https://cart-blanche-main.vercel.app/admin))

**What it is.** A storefront you explore spatially instead of scrolling a template, plus the merchant portal behind it. A React and Supabase prototype, MIT, that runs on a demo catalogue with no login. For real accounts and the AI chat, you bring your own Supabase project and AI key.

**Who it's for.** Small fashion and streetwear brands who are stuck paying someone to operate their store. Developers who want a store front that isn't a template.

**Why it exists.** I heard from the owners of a real fashion brand that even after twelve years they still paid someone overseas to run their Shopify. The backend store setup is the worst of it, and Shopify's built-in AI didn't help. I wanted to see if one person, directing AI, could build a better version.

**What's different.**
- You move through the collection like a canvas: zoom out to everything, drag, dive in.
- Pairing is a graph the merchant draws, and it feeds Build a Set.
- The portal is built for one person running a shop, with AI that proposes and you confirm.
- I built it by directing Lovable, 2,164 bot commits' worth, and all of that history is public. It's now a clone developed only in Claude Code.

**How to try it.** `git clone https://github.com/fidgetcoding/cart-blanche-main && cd cart-blanche-main && npm ci && npm run dev`. Shop at `/`, run the store at `/admin`. No login. Nothing you do gets saved. For the backend, follow [SETUP.md](SETUP.md).

## What works today

- Storefront with two templates, product detail, sizes, Build a Set, cart, discount rules, subscribe popup, all on bundled data.
- All 11 admin routes work logged out on sample data, with no backend configured.
- From a fresh clone of `34b5c43`, `npm ci` works, 323 unit and component tests pass, lint has 0 errors and 50 warnings, `tsc` is clean and the build passes. `npm audit` shows no high or critical issues. GitHub Actions runs the same checks on every push.
- Security work on November 1: merchant accounts are invitation only, shoppers can't write to the database or storage directly, and discount checks, signups and photos are rate limited. Those fixes were checked on a real local Supabase stack with real sign-in tokens and a fake AI provider. The per-minute limits were actually hit there, and a real magic link landed through the local mail catcher.

## Where it went

I continued this project privately for a series of boutique fashion brands and wired it for their specific stores. Rather than an open system, Cart Blanche has chosen to be a "selects" platform: invite only, for premier boutique fashion brands.

See [EVOLUTION.md](EVOLUTION.md) for how it got here.

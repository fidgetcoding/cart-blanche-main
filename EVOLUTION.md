# How Cart Blanche got built

My words are quoted as I wrote or said them, typos fixed, nothing else. Commit hashes are from this repo. "Private note" means a dated chat or call record I keep offline.

## 1. The short version

In February 2026 the owners of a real fashion brand told me what running a serious Shopify store actually takes. On February 17 I had a PDF and no code. On February 18 Lovable made 417 commits for me and I presented a first version to those same owners.

Over the next three months it grew into a spatial storefront with two templates, a pairing canvas and a merchant portal, in 2,164 Lovable commits, with most of them landing on a handful of huge days. A technical collaborator came on to plan production and mobile. On November 1 it got a logged-out demo, a security pass and an MIT license, and it left Lovable for good. It's now a clone developed only in Claude Code, and readers bring their own Supabase and AI key. On November 4 and 5 the cart got steadier, a shopper's first download got 44% smaller, every lint warning and audit advisory went to zero, and the store moved to its own address at cartblanche.io/demo.

This repo is the public prototype. I continued this project privately for a series of boutique fashion brands, wiring it for their specific stores. That happens in a private version, and that work is still in progress. Rather than an open system, Cart Blanche has chosen to be a "selects" platform: invite only, for premier boutique fashion brands.

## 2. Origin, in my words

On what the brand owners told me (call, February 26, 2026):

> "They have somebody that's like overseas running their store. And without that person, and they've been doing this process for twelve years, they're still jumping through hoops even as domain experts."

(call, February 20, 2026):

> "You have to hire a Shopify store manager and you can't even do it by yourself. Like, that's ridiculous to me."

On Shopify's AI, reacting to a post about it (private note, February 25):

> "I kinda disagree since their AI sucks."

Where I started (private note, February 17):

> "OK so I have this project I'm trying to build. I think I'll probably use Lovable to build it. I need to figure out everything that goes into it and how to break it down piece by piece in order to build it all completely proper."

And the order of attack, same day:

> "I really want to start with the smart shop and make the admin portal along with that. (I don't mean the admin as in me who's building the website, I mean the admin as in the person who's running the store.)"

The use case: the owners of a real fashion brand explained the problem and gave me the seed of the idea, a store you browse the way you scroll.

## 3. Timeline

| Date (2026) | What happened | Evidence |
|---|---|---|
| Feb 17 | "Just the doc, haven't started building." Full breakdown, smart shop and admin first | Private note |
| Feb 18 | 417 commits: flat grid, cart, chat sidebar, Style Kit, liquid glass, product media uploads, grid editor. First demo to the brand owners | `c0e13ba`, `2067763`, `14e410f`, `90b8150`, private note |
| Feb 19 | Grid editor connected to the storefront, Lab sandbox pages. Roadmap talks start | `fd06456`, `6ed33ee`, private notes |
| Feb 20 | Product shaping docs and the AI style assistant spec | `SmartCart_AI_Style_Assistant_Spec.md` |
| Feb 26 to 28 | Demo and database products merged, tag deletion | `d38ecdd`, `5df7219` |
| Mar 1 | This repo created from a remix. Product images regenerated, some pulled | `cc023b8`, `9be8ed4` |
| Mar 2 | Biggest day: 561 commits. Two templates, per-template themes, node canvas for the Style Guide, pairing tests | `fc41a97`, `054142f`, `4c2cb28` |
| Mar 3 | 207 commits. Configured matches, auto-arrange, thumbnails | `63a8dcb`, `57a498d` |
| Mar 4 | Demo for family. Notes on sizes, colors, zoom | Private note |
| March | Tester feedback collected into a master action list | Tracker doc |
| Apr 6 to 7 | Detail view fixes, pointer-based inventory drag, page breaks | `ad489c7`, `ee8c6e5`, `bee8d44` |
| Apr 26 | Remaining feedback verified against a build | Remaining-items doc |
| Apr 27 | Size chart editor, centered grid | Status note, `a002501` |
| May 1 | Gender toggle, waitlist table, 11 demo edits | `802c810`, `8629703`, `3c2231d` |
| May 2 | 327 commits. Waitlist page, subscriber capture, colorways, drag reorder, Build a Set fix | `c2b479c`, `d1987ca`, `0b5cdbe` |
| May 3 | Look Book audit, test suite 144 of 144. Active work is down to the AI Stylist | Status note |
| May 4 | Auth gate removed | `93138d3` |
| May 21 | Sidebar hover zones. Last Lovable commit | `3706a83` |
| Nov 1 | Email-link sign-in, logged-out demo admin, security migration, storefront scoping, hardened chat functions, MIT | `49d622b`, `e20777a`, `482ae68`, `75940df`, `ef7f16f`, `05848b8` |
| Nov 1 | Leaves Lovable: a clone developed only in Claude Code, with readers bringing their own Supabase and AI key. Runs with no backend, any OpenAI-compatible provider, `SETUP.md` | `0fe3198`, `756571a`, `1dbc52d`, `99481a5` |
| Nov 1 | Advisories, images, types and lint: no high or critical audit issues, real WebP files, chat functions type-check, lint errors from 116 to 0 | `920d7b1`, `1449e6a`, `c7c95bc`, `6af6d32` |
| Nov 1 | Shopper signups and photos through rate limited functions, discount checks rate limited, merchant accounts invitation only | `fe19888`, `43b1f33`, `74cae19`, `6b31fea` |
| Nov 1 | The SL template on phones, real product details kept, failed saves reported, Build a Set and the look book on the store's own products, CI | `d21bf32`, `7c074a2`, `9bf53e5`, `b901de1`, `9d2c5d4`, `8df52d2` |
| Nov 1 | Real-store fixes: no sample catalogue on a real store, stylist on the store's own products, no invented orders, blank slugs. Phone admin, responses on Checkout and Connect Stripe, a details panel that stopped flapping | `cac1ec2`, `296d08e`, `f2af4e7`, `165ba35`, `ebd12fd`, `3c8b504`, `1444ecc` |
| Nov 1 | A merchant's flows on a clean local stack, then a button sweep: 13 fixes, from the look book list to the Orders export | `a469ade` to `34b5c43` |
| Nov 4 | A steadier cart and a smaller first download: bad saved data no longer crashes the cart, money runs in cents, merchant pages load only when opened. Released and checked on the live deploy | `d973711`, release record |
| Nov 5 | `npm audit` and lint warnings both to 0, React Router 7, and the stale-value bugs those warnings were hiding, fixed | `5632af8` |
| Nov 5 | Store and portal move under `/demo`. The root sends you there while it waits for a landing page, and old `/admin` and `/auth` links forward | `0d9443c` |
| Nov 5 | cartblanche.io points at the store, `www` lands on it in one hop, and the docs link there | `97f1d36`, `abe30ee`, private note |
| Nov 5 | Landing page design rounds. The first two got dropped, and the third started from the copy | Private note |

History shape: February 495 commits, March 933, April 157, May 579, November 67. Three days hold more than half of it: March 2, February 18, May 2.

## 4. Round by round

### Round 1: a storefront in a day (February 17 to 19)
- **Built:** the flat grid, the zoom, the cart, the first admin and a grid editor.
- **Tested:** shown to the brand owners on February 18, and to another contact the next day.
- **Broke:** mostly look and feel. The day's commits are small corrections to labels, glass and headers.
- **Wanted next:** the whole platform on paper, which meant days of product shaping and a master doc.

### Round 2: templates and pairing (March 1 to 6)
- **Built:** two storefront looks, YZ and SL, per-template themes, a node canvas for what pairs with what, Build a Set, regenerated product images.
- **Tested:** a pairing logic test suite, a demo for family, and tester walkthroughs.
- **Broke:** theme leaked between admin and storefront (`fc41a97`, plus a dedicated fix prompt). Images came back wrong repeatedly, so batches got re-ingested (`4e9440f`, `2ec554e`). The repo got too big to upload as a zip.
- **Fixed:** theme isolation. Template fixes were done by writing precise prompts for Lovable.
- **Wanted next:** real feedback, turned into a list.

### Round 3: feedback pass (March to April)
- **Built:** the master action list. Detail view peeks, arrows, responsive fixes, swipe logic, inventory drag.
- **Tested:** every item checked against a build. On April 26 the status tracker still held 1 item conservatively marked done and 61 unverified, and a second pass verified which were really open.
- **Broke:** detail view clipped add-to-cart on some window sizes (`ad489c7`), vertical swipe blocked (`213b14f`), and the SL swipe bounce stayed unresolved as of that list.
- **Wanted next:** what a real merchant needs on the back end.

### Round 4: the portal grows up (April 27 to May 4)
- **Built:** size chart editor, gender data, waitlists by size, subscriber capture with CSV, colorways, Look Book filtering.
- **Tested:** the suite at 144 of 144. The May note credits that number to the pairing file, but today that file has 16 tests and 127 belong to the template agent, so 144 reads as the whole suite.
- **Broke:** inventory save, colorway ids in variants (`d1ae07d`), Look Book node logic (5 bugs in one audit).
- **Fixed:** those.
- **Wanted next:** the AI Stylist. Called "one last leg", it was really six sub-arcs. It wasn't finished that May.

### Round 5: open it up (November 1)
- **Built:** a logged-out demo admin on an in-memory client, email-link sign-in, an MIT license. Lovable is the true start of this codebase, but development moved here: it's a clone worked on only in Claude Code, and anyone who wants the backend brings their own Supabase and AI key.
- **Tested:** see section 6.
- **Broke, found in the audit:** storefront data wasn't scoped to one merchant (`75940df`), protected store columns were writable (fixed with triggers), chat functions needed limits (`ef7f16f`). Long shopper chats would hit the new cap, so history got trimmed (`6121188`).

### Round 6: make it stand on its own (November 1)
- **Built:** a backend-free default, provider-neutral AI keys and a setup guide, then functions for what logged-out shoppers do, so they never get direct write access.
- **Tested:** a real local Supabase stack, the suite and the browser. See section 6.
- **Broke:** on that real stack every table failed with permission denied, because new Supabase projects no longer expose new tables by default (`2f10bb2`). A real store also sold the sample catalogue and could only get recommendations from it (`cac1ec2`, `296d08e`), and a store with no orders saw 100 invented ones (`f2af4e7`). Oversized photos hung the client (`5fc90bd`), and the product details looped open and shut under the cursor (`1444ecc`).
- **Fixed:** all of those, and every lint error, with no rules turned off (`6af6d32`).

### Round 7: a steadier cart and a smaller download (November 4)
- **Built:** the cart recovers from bad saved data and failed writes, quantities get checked, totals and discounts run in cents, and a minimum-spend code drops off when the cart falls under it. Recommendations and Quick Add skip sold-out sizes, and a budget swap keeps the sizes and quantities you actually picked. Clearing the stylist chat cancels the request still in flight. The merchant pages now load only when you open them, so a shopper's first download went from 1,426,048 bytes of JavaScript to 800,168.
- **Tested:** 341 tests in 40 files, and 45 browser checks on a local build covering the cart, all 11 guest admin routes and both templates on a phone. CI went green on the released commit. Then 19 read-only checks on the live deploy, where all 10 entry files matched the local build byte for byte. See section 6.
- **Broke, found in the audit:** malformed cart data crashed the totals, percentage discounts rounded to whole currency units, a minimum-spend code stayed on after the cart dropped below it, a cleared chat still took old replies, draft and archived samples leaked into the shop and its recommendations, and every admin page shipped in the shopper's first download.
- **Fixed:** all of those, with regression tests (`d973711`).
- **Wanted next:** the 50 lint warnings and 5 moderate audit advisories that were still sitting there.

### Round 8: zero warnings (November 5)
- **Built:** React Router 6.30 to 7.18.5 to clear its advisories, patched nested packages, providers and button variants moved into their own files, and complete hook dependency lists. No lint rules switched off.
- **Tested:** lint at 0 warnings, `npm audit` at 0 for production and dev, 347 tests in 43 files, a build with no warnings, and 45 browser checks with no console warnings or errors (`5632af8`, then CI).
- **Broke, found by fixing the warnings:** the style guide canvas got stuck in a render loop, a save during the first insert made a duplicate row, inventory skipped the saved product order when the layout arrived mid-fetch, zooming back in didn't cancel the all-products peek, the product view showed stale photos and counters after a colorway or gender switch, and a swapped-in Style Kit product kept the old size.
- **Fixed:** all of them, with regression tests (`5632af8`).
- **Wanted next:** its own address.

### Round 9: its own address (November 5)
- **Built:** the store and portal moved under `/demo`, set from one constant (`src/lib/base-path.ts`). The root redirects to `/demo` for now, kept free for a landing page, and old `/admin` and `/auth` links forward to the same page under `/demo`. cartblanche.io points at it.
- **Tested:** 347 tests and 48 browser checks, including the root and old `/admin` redirects (`0d9443c`). CI green on every push since.
- **Broke:** `www` took two redirects to reach the store.
- **Fixed:** one hop now (`97f1d36`).
- **Wanted next:** a landing page at the root whose one job is getting you into the demo. The first round of designs didn't look like the app at all (private note, November 5):

> "tbh I hate all of these, none of them look like the app itself... suddenly using fonts that aren't in the app, buttons that aren't, etc..."

The second round was built inside the real app, with its own fonts, buttons and both light and dark modes, and it still didn't land. The problem was the copy. So the third round started from the copy, a scroll through the whole system, and that design work is still going. Until it ships, the root sends you straight to the demo.

## 5. Feature family tree

```
"Shopify needs a full-time operator"
├─ spatial storefront → grid editor → two templates (YZ, SL) → per-template themes
│  └─ Lab sandbox → template builder agent (rule-based, with its own tests)
├─ admin portal → inventory → size charts → waitlist by size → subscriber capture
│  └─ AI store manager (propose, then confirm)
├─ cart → AI style assistant → SmartCart chat → stylist on the store's own products
└─ "complete the look" → Style Guide canvas → pairing logic → Build a Set → Look Book
visitors can't log in → demo client → all admin routes work logged out
real store → sample catalogue leaks found → samples kept to the demo
leaving Lovable → Claude Code only → bring your own Supabase and AI key → SETUP.md
cart audit → money in cents, bad saved data survived → merchant pages load on demand → 44% smaller first download
lint and audit to zero → hidden stale-value bugs found and fixed
store under /demo → cartblanche.io → landing page (in design)
```

## 6. Test log

| When | What | Result | Where |
|---|---|---|---|
| Spring | Template agent suite | 127 tests, still in the count below | Project hub note, `template-agent.test.ts` |
| May 3 | Whole suite | 144 of 144 | Status note |
| Nov 1, before the backend-free work | Vitest | 202 of 202 | Rerun while writing this |
| Nov 1, tip `8df52d2` | Vitest, unit and component tests | 293 of 293 in 26 files: template agent 127, chat guards 31, shopper guards 18, pairing 18, demo store 14, the rest smaller | Run while writing this |
| Nov 1, tip `8df52d2` | Lint, typecheck, build | Lint 0 errors, 52 warnings. `tsc` clean. Build passes | Run while writing this |
| Nov 1, tip `8df52d2` | `npm audit --omit=dev` | No high or critical, 5 moderate | Run while writing this |
| Nov 1, fresh clone of `8df52d2` | `npm ci`, lint, build, tests | All pass, 293 tests | Run while writing this |
| Nov 1, `8df52d2` | GitHub Actions: `npm ci`, lint, typecheck, tests, build | Green | GitHub Actions |
| Nov 2, fresh clone of `34b5c43` | `npm ci`, lint, `tsc`, tests, build | 323 of 323 in 33 files. Lint 0 errors, 50 warnings. `tsc` clean. Build passes. `npm audit --omit=dev`: no high or critical, 5 moderate | Run while writing this |
| Nov 1, `34b5c43` | All 31 migrations from a clean reset on a real local stack, then a merchant's flows and a button sweep in a browser | 13 fixes, `a469ade` to `34b5c43` | Session scripts, not in this repo |
| Nov 1 | Real local Supabase stack | Showed every table failing with permission denied, fixed with explicit grants | `2f10bb2` |
| Nov 1 | Security fixes on that stack, with real sign-in tokens and a fake AI provider | Storage ownership and limits, closed reads on merchants and discount codes, locked fee and Stripe columns, shopper functions and their limits, merchant signups closed, a real magic link through the local mail catcher, then signed-in writes confirmed in Postgres | Session scripts, not in this repo |
| Nov 1 | Rate limits hit on that stack, where every caller shares one gateway IP | Stylist: the 21st request in a minute got a 429. Discount checks: the 21st in a minute got `rate_limited`. Signups and photos: the 6th in a minute got a 429. A store seeded at 300 wrong guesses an hour was blocked | Session scripts, not in this repo |
| Nov 1 | Browser, on that stack and on the no-backend build | Storefront, all 11 admin routes, and a logged-out shopper's subscribe, waitlist, cart code, stylist and photo upload | Session scripts, not in this repo |
| Nov 1 | `SETUP.md`, local path | Ran end to end from a fresh clone at `6243771` | Session notes |
| Nov 1 | Product details migration, save failures, look book on real products | Embedded Postgres and unit tests | `9bf53e5`, `b901de1`, `9d2c5d4` |
| Nov 1 | `deno check` on all 4 functions | Pass | Session notes, `c7c95bc` |
| Nov 1 | 25 migrations on embedded Postgres with stubs | 42 role checks pass | Audit report |
| Nov 1 | Edge functions, outbound stubbed | 16 `smartcart-chat`, 15 `smart-chat` checks pass | Audit report |
| Nov 1 | Browser sweep, dev and production | No writes, no other Supabase requests. One dev-only console error, fixed in `3c8b504` | Audit report |
| Nov 1 | Demo clicks | Discount create and delete, waitlist, order status, inventory, add product, cart promo rules all behave | Audit report |
| Nov 4, `d973711` | Fresh install, Vitest, lint, `tsc`, build | 341 of 341 in 40 files. Lint 0 errors, 50 warnings. `tsc` clean. Build passes. `npm audit --omit=dev`: no high or critical, 5 moderate | Release record |
| Nov 4, `d973711` | Browser checks on a local build | 45 pass, no uncaught errors: cart, promo, reload and bad-data recovery, all 11 guest admin routes, demo writes and reset, both templates on a phone | Release record |
| Nov 4, `d973711` | First JavaScript download, before and after | 1,426,048 to 800,168 bytes (43.89% less), gzipped 389,854 to 241,369 (38.09% less). That's download size, not page speed | Release record |
| Nov 4, `d973711` | GitHub Actions: install, lint, typecheck, tests, build | Green, 341 tests | GitHub Actions run 41858702829 |
| Nov 4, `d973711` | Read-only checks on the production deploy | 19 pass, no browser errors. All 10 entry files match the local build byte for byte | Release record |
| Nov 5, `5632af8` | Lint, `tsc`, tests, build, audit, browser | Lint 0 warnings. 347 of 347 in 43 files. Build with no warnings. `npm audit` 0, production and dev. 45 browser checks with no console warnings or errors | `5632af8`, GitHub Actions |
| Nov 5, `0d9443c` | The same, plus the redirects | 347 tests. 48 browser checks, including the root and old `/admin` redirects | `0d9443c`, GitHub Actions |
| Nov 5, `abe30ee` | GitHub Actions | 347 of 347 in 43 files, lint clean, 0 vulnerabilities, build passes | GitHub Actions run 42011714889 |

## 7. Roads not taken

- **Starting with SmartCart and cross-store intelligence.** Held off on day one for smart shop and admin first.
- **Matching Shopify feature for feature.** The competitive teardown argued against it.
- **Picking one default template.** Decided May 2: it depends on the audience.
- **One exclusive payment processor.** Decided May 2: bring your own.
- **Loosening the database for visitors.** The demo runs on an in-memory client instead.
- **Passwords.** Gone. Email link only.
- **Staying on Lovable.** The clone moved to bring-your-own instead.
- **Switching lint rules off.** Every warning got fixed where it started, with no `eslint-disable` comments, and that's how the hidden bugs in round 8 turned up.
- **A landing page in a new look.** The first designs brought in fonts and buttons the app doesn't have, so they went.

## 8. Where it went

I continued this project privately for a series of boutique fashion brands, wiring it for their specific stores. That happens in a private version, and that work is still in progress. Rather than an open system, Cart Blanche has chosen to be a "selects" platform: invite only, for premier boutique fashion brands.

## 9. Before and after visuals

May 3, on my screen in the Lovable editor (cropped):

![Peek mode, May 3](docs/images/before-may-peek.png)

November 1, the same jacket on the current build:

![Product view, November 1](docs/images/cart-store-product.png)

The storefront grid, November 1:

![Storefront grid](docs/images/cart-store.png)

The store portal in demo mode, November 1:

![Inventory in demo mode](docs/images/cart-demo-inventory.png)

The Look Book, November 1:

![Look Book](docs/images/cart-demo-lookbook.png)

Product photos and the logo aren't covered by the MIT license.

## 10. My method

1. **Start with the doc.** Break the thing into every piece before writing a prompt.
2. **Pick the slice that proves it.** Storefront and admin first. Everything clever waits.
3. **Show it the next day.** The first demo came within 24 hours of the first commit.
4. **Turn feedback into a tracked list, then verify against the build.** Don't trust "done".
5. **Fix by prompt, precisely.** When Lovable breaks something, write what it may and may not touch.

## 11. Sources

- Commits: `git log` of `fidgetcoding/cart-blanche-main`.
- Code: `src/lib/demo/`, `src/lib/pairing-logic.ts`, `src/pages/admin/`, `supabase/migrations/`, `supabase/functions/`. Setup: `SETUP.md`.
- Private, kept by me: chat and call records dated February 17 to May 3, 2026. Status note, May 3. Tracker docs, March and April 26. `SmartCart_AI_Style_Assistant_Spec.md`. `shopify-competitive-analysis.md`.
- Audit report, November 1, 2026 (session notes), plus runs made while writing this.
- Release record for `d973711`, November 4, 2026, kept offline: the audit, the test, browser and bundle logs, and the live checks.
- CI runs on the repo's Actions tab. Landing page design notes, November 5, 2026 (private note).

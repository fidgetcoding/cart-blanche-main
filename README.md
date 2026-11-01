![Cart Blanche](docs/images/banner.png)

# Cart Blanche

**An online store you explore like a feed, and a back office one person can actually run.**

## ▶ [Try it live, no login: cart-blanche-main.vercel.app](https://cart-blanche-main.vercel.app)

The store portal is at [/admin](https://cart-blanche-main.vercel.app/admin), on sample data. The live copy has no AI key, so the store manager gives a canned reply and the stylist says it isn't set up.

**Want the real story?** [ESSENCE.md](ESSENCE.md) is the one-pager. [EVOLUTION.md](EVOLUTION.md) is how it went from a doc to a working prototype.

## What it is

Zoom out to see the whole collection, drag around it, dive into a jacket, build a look. On the other side there's a store portal with inventory, size charts, discounts, waitlists and an AI store manager, so you don't need to hire someone to work your own shop.

This repo runs on a demo catalogue and sample data, so you can open the admin with no login and click everything. Your edits stay in memory and reset on reload.

Published under MIT. I continued this project privately for a series of boutique fashion brands and wired it for their specific stores. Rather than an open system, Cart Blanche has chosen to be a "selects" platform: invite only, for premier boutique fashion brands.

## Why I made it

Shopify is impossible to manage alone without paying someone overseas, especially the backend store setup. I heard it from the owners of a real fashion brand, who laid the whole problem out for me.

> "They have somebody that's like overseas running their store. And without that person, and they've been doing this process for twelve years, they're still jumping through hoops even as domain experts."

> "You have to hire a Shopify store manager and you can't even do it by yourself. Like, that's ridiculous to me."

And Shopify's built-in AI didn't help. So I started building, by directing Lovable, one prompt at a time. It's since moved off Lovable, and this clone is developed only in Claude Code.

## Try it

You need Node and npm.

```sh
git clone https://github.com/fidgetcoding/cart-blanche-main
cd cart-blanche-main
npm ci
npm run dev
```

Open http://127.0.0.1:8080, then:

1. **Shop.** Scroll or pinch to zoom the grid, drag to pan, swipe for the next page, click a product. Add it to your cart. `SPRING20` works over $150.
2. **Run the store.** Go to `/admin`. No login. Change inventory, edit a size chart, create a discount, fulfil a waitlist entry. Nothing is saved, on purpose.
3. **Look at the templates.** `/admin/lab` has the two storefront looks, YZ and SL.

Checked on 2026-11-01 from a fresh clone of `8df52d2`: `npm ci` works, 293 unit and component tests pass, lint has 0 errors and 52 warnings, `tsc` is clean and the build passes. `npm audit` shows no high or critical issues. GitHub Actions runs the same checks on every push.

### Want the real thing?

I'm not hosting a database for anyone. For real accounts and saved data you connect your own Supabase project, and for the AI features you bring your own AI key. [SETUP.md](SETUP.md) walks through it, local or hosted, and has a block you can paste straight into your coding agent.

## What's in it

- **SmartShop:** a spatial storefront with two templates, zoom, drag, swipe, peeks at the next item, and sizes and colorways on the product.
- **Build a Set:** complete-the-look pairing, driven by a pairing graph you edit on a node canvas (the Look Book).
- **Smart Portal:** dashboard, inventory, products, orders, size charts, discounts, subscribers with CSV export, per-size waitlists, store settings.
- **AI stylist and AI store manager:** the stylist recommends products from the store and the manager proposes changes you confirm. Both need your own Supabase and AI key, and they're built to talk to any OpenAI-compatible API.
- **Demo mode:** with no backend configured, the storefront and every admin page run on sample data and never touch a database.
- **Locked down:** merchant accounts are invitation only, shoppers can't write to the database or storage directly, and discount checks, signups and photos are rate limited. Those fixes were checked on a real local Supabase stack with a fake AI provider.

## License

Code is [MIT](LICENSE). Built by Nate Davidovich.

The Cart Blanche logo and all product photos are **not** covered by the license. Replace them with your own before you ship anything.

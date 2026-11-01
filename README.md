# Cart Blanche

A clothing store you move around in instead of scroll through, with a merchant admin and an AI stylist. Clone it and it runs right away on sample data, no accounts needed.

## Why it exists

Most online stores are a grid and a filter sidebar. Cart Blanche tries a store laid out like a space: pan and zoom across the collection, open a piece, and ask a stylist what goes with it.

## Try it

```sh
bun install
bun run dev
```

Open http://127.0.0.1:8080. Go to `/admin` for the merchant side. It runs on sample data, and nothing you change is saved.

## What's inside

- **Spatial storefront:** pan, zoom and swipe through products, filter by category and gender, and build a cart.
- **AI stylist:** recommends products, builds outfits and rebuilds a cart to a budget.
- **Merchant admin:** dashboard, orders, inventory, grid editor, discounts, size charts, look book, waitlist and subscribers.
- **AI store manager:** answers questions about sales and stock, and proposes edits for the merchant to confirm.
- **Template lab:** alternate storefront templates to try out.

## Want the real thing?

I'm not hosting a database for anyone. To get real accounts and saved data you connect your own Supabase project, and to get the AI features you bring your own AI key.

[SETUP.md](SETUP.md) walks through it, local or hosted, and has a block you can paste straight into your coding agent.

## Built with

React, Vite, Tailwind, Supabase and any OpenAI-compatible AI provider. MIT licensed.

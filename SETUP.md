# Setting up Cart Blanche

I'm not hosting a database for you. Out of the box this repo runs on sample data with nothing to configure, and when you want real accounts you connect your own Supabase project, either on your machine or hosted.

## Paste this to your coding agent

```text
Set up this Cart Blanche repo for me by following SETUP.md.

1. Ask me which I want: demo only, local Supabase (needs Docker), or a hosted
   Supabase project. Ask for any account or key you can't get yourself, and
   never print or commit keys. .env files are gitignored; keep it that way.
2. Install dependencies and start the app. Confirm the storefront and /admin load.
3. For a backend: apply every migration in supabase/migrations, write .env from
   .env.example, and restart the dev server.
4. Create my merchant account as the "First merchant account" section describes.
   Prove sign-in works: request a magic link on /auth, open the email, and check
   that I land on /admin with no "Demo data" marker, then create a discount code
   and confirm it survives a reload.
5. If I give you an AI key, set AI_API_KEY for the functions and check that the
   storefront stylist replies. If not, check that it says it isn't set up.
6. If I want it online, deploy the frontend as the Vercel section describes, then
   add the site's /admin URL to the Supabase redirect list.

Tell me what ran, what didn't, and anything I still have to do by hand.
```

## 1. Try it with no backend

```sh
bun install    # or: npm ci
bun run dev    # or: npm run dev
```

Open http://127.0.0.1:8080. The storefront uses the bundled catalogue and `/admin` runs on sample data. Edits stay in your browser and vanish on reload, and the AI features say they aren't set up.

## 2. Connect a backend

Pick one. Either way, the app reads these values from `.env`, which you create from `.env.example`:

| Name | What goes in it |
|---|---|
| `VITE_SUPABASE_URL` | Your project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your publishable or anon key. It's safe in a browser; never use the service role or secret key here |
| `VITE_STORE_MERCHANT_ID` | Optional. The user ID whose store logged-out visitors see |

Restart the dev server after changing `.env`.

### Local Supabase

You need Docker and the [Supabase CLI](https://supabase.com/docs/guides/cli).

```sh
supabase start            # first run downloads images, then applies every migration
supabase status -o env    # shows API_URL and PUBLISHABLE_KEY for your .env
```

Set `VITE_SUPABASE_URL` to `API_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to `PUBLISHABLE_KEY`. Sign-in emails don't leave your machine: open http://127.0.0.1:54324 to read them, then click the link.

`supabase/config.toml` allows sign-in redirects for port 8080. If you run the app on another port, add its `/admin` URL there and run `supabase stop && supabase start`.

### Hosted Supabase

Create a project at [supabase.com](https://supabase.com), then:

```sh
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

- **Keys:** copy the project URL and publishable key into `.env`.
- **Sign-in redirects:** under Authentication, URL Configuration, set the Site URL to your site and add `<your-site>/admin` to the redirect URLs. Add `http://127.0.0.1:8080/admin` too if you'll develop against this project.
- **Email:** the built-in email service has a low hourly limit. Add your own SMTP before real people sign in.

### First merchant account

Merchant accounts are by invitation, so strangers can't create one on your store. Add yourself first, then sign in at `/auth`.

- **Local:** run this with the `API_URL` and `SERVICE_ROLE_KEY` from `supabase status -o env`:

  ```sh
  curl -X POST "$API_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"email":"you@example.com","email_confirm":true}'
  ```

- **Hosted:** under Authentication, Users, add or invite the user. Then turn off "Allow new users to sign up" in the Authentication settings. Locally `config.toml` already has it off.

Each person you add gets their own store.

## 3. Turn on the shopper features

Four Supabase Edge Functions handle what logged-out shoppers and the AI do. Deploy them on a hosted project once the migrations are in, because they refuse requests without the rate limiter those add:

```sh
supabase functions deploy store-signup
supabase functions deploy chat-upload
supabase functions deploy smartcart-chat
supabase functions deploy smart-chat
```

Locally, `supabase functions serve` runs them all.

- `store-signup` adds shoppers to waitlists and subscriber lists.
- `chat-upload` stores photos shoppers send the stylist.
- `smartcart-chat` is the storefront stylist, and `smart-chat` is the merchant assistant. Both need an AI key.

## 4. Turn on the AI features

The stylist and the merchant assistant talk to any OpenAI-compatible API:

| Name | Default | What it does |
|---|---|---|
| `AI_API_KEY` | none | Your provider key. Without it the functions answer 503 and the stylist says it isn't set up |
| `AI_BASE_URL` | `https://api.anthropic.com/v1` | The provider's OpenAI-compatible endpoint |
| `AI_MODEL` | `claude-opus-5-5` | The model to use |

Some other values, checked against each provider's docs on 2026-11-01. Model names change, so check the docs if one is refused.

| Provider | `AI_BASE_URL` | `AI_MODEL` |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-6-astra` |
| Google | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-3.8-flash` |

**Local:** put the values in `supabase/functions/.env`, which is gitignored, then run:

```sh
supabase functions serve
```

**Hosted:**

```sh
supabase secrets set AI_API_KEY=<your-key>
```

Limits are built in and stored in your database:

| What | Per visitor | Overall |
|---|---|---|
| Stylist | 20 a minute, 200 a day | 2,000 a day |
| Photo uploads | 5 a minute, 20 a day | 200 a day |
| Shopper signups | 5 a minute, 30 a day | 2,000 a day per store |
| Discount code checks | 20 a minute | 300 wrong guesses an hour per store |

The assistant allows each merchant 60 requests an hour and 300 a day. The constants are at the top of each function, and in `supabase/migrations` for discount codes.

Photo questions in the stylist only work on a hosted project, because your AI provider has to be able to download the image from your storage.

## 5. Put the frontend on Vercel

1. Import the repo. Vercel detects Vite, and `vercel.json` sends every route to the app so links like `/admin` work.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under Environment Variables, plus `VITE_STORE_MERCHANT_ID` if you want one. Leave them out to publish the demo.
3. Deploy, then add `https://<your-site>/admin` to your Supabase redirect URLs.

## Good to know

- **Showing your store to everyone:** by default, logged-out visitors see the bundled catalogue and only a signed-in merchant sees their own products. Set `VITE_STORE_MERCHANT_ID` to a merchant's user ID (Authentication, Users) to change that.
- **Shopper signups:** with `VITE_STORE_MERCHANT_ID` set, logged-out shoppers join waitlists and subscribe through the `store-signup` function, so deploy it or those forms will say they're unavailable.
- **Colima:** `supabase functions serve` needs the repo and its temp folder somewhere the VM can read. Keep the repo under your home folder and run `TMPDIR=~/.cache supabase functions serve` if you see "failed to determine entrypoint".
- **Older Supabase projects:** the migrations set table access explicitly, so they work on new projects, which no longer expose tables by default, and old ones alike.

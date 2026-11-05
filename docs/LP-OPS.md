# Landing page operations

The landing page is `index.html` at the site root (`src/landing/`). The store and portal are `demo/index.html` under `/demo`. This file is the loop for measuring and improving the landing page.

## Setup (not done yet)

Analytics are wired but **off until a PostHog key is set**. With no key, `src/landing/analytics.ts` returns early and PostHog is never downloaded.

1. Create a PostHog project and copy its project API key.
2. In Vercel (project `cart-blanche-main`), add environment variables for Production:
   - `VITE_POSTHOG_KEY`: the project key.
   - `VITE_POSTHOG_HOST`: `https://us.i.posthog.com` for a US project, or `https://eu.i.posthog.com` for EU. The host must match the key's region, or every request fails with 401 and no data arrives.
3. Redeploy. Heatmaps and session data start on the landing page only.

The primary call to action is every link with `class="signup-cta"` (the top-right Enter the demo button and the closing button). Experiments target that class.

## L3 · Run an A/B test

1. Add `disable_web_experiments: false` to the `posthog.init` call in `src/landing/analytics.ts`.
2. In the PostHog Toolbar: Experiment, then New. Pick `signup-cta`, edit variant B, set the primary metric (clicks on `signup-cta`), and launch at an automatic 50/50 split.
3. The flag `landing-ab` is already read on load. Its `test` variant sets `data-landing-variant="b"` on `<html>` for any variant B styling.
4. Set the run length before launch and don't peek. Call it only at **95% or higher chance to win AND 50 or more exposures per variant**. Stopping early ships false winners.

## L4 · Weekly optimizer loop

Connect the PostHog MCP read-only:

```
claude mcp add --transport http posthog "https://mcp.posthog.com/mcp?readonly=true" -s user
```

The weekly agent prompt:

```
You're my landing-page optimizer. Using the PostHog MCP (read-only), pull results
for experiment 'landing-ab'. If a variant has >95% chance to win and ≥50
exposures/variant, reply with: the winner, the % lift, and ONE specific change to
test next. Wait for my "approved". On approval, edit the page in GitHub repo
fidgetcoding/cart-blanche-main, open a PR, summarize. Never merge without my approval.
```

Schedule it with a GitHub Actions cron (Claude Code headless). Keep the human approval gate, and give the job write access only on the deploy step.

## L5 · Personalize

1. Capture interest signals, for example `posthog.capture('viewed_smartcart')` when a feature section comes into view.
2. Build a dynamic cohort ("performed X in the last 30 days").
3. Create a multivariate flag `lp-personalize` with a JSON payload per variant (`{ hero, cta }`), and target its release condition at the cohort.
4. Read it with `posthog.getFeatureFlagResult('lp-personalize')` in `onFeatureFlags` and apply the payload.

Cookies and GeoIP are personal data, so add a consent banner before L5. Wait for real volume in each cohort before trusting a tailored variant.

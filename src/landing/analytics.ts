// PostHog for the landing page only (docs/LP-OPS.md has the A/B and optimizer playbook).
// Nothing loads until VITE_POSTHOG_KEY is set, so the page costs nothing without it.
const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
// Must match the key's region (US or EU), or every request 401s and no data arrives.
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com';

export async function initAnalytics(): Promise<void> {
  if (!KEY) return;
  const { default: posthog } = await import('posthog-js');
  posthog.init(KEY, { api_host: HOST, defaults: '2026-05-30', enable_heatmaps: true });
  // L3 is pre-wired: a 'landing-ab' experiment's test variant marks the page for version B.
  posthog.onFeatureFlags(() => {
    if (posthog.getFeatureFlag('landing-ab') === 'test') document.documentElement.dataset.landingVariant = 'b';
  });
}

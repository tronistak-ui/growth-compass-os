// White-label config for a single deployment. Every deployment of this app
// belongs to exactly one client (their own Oracle Cloud instance, handed
// over after setup) — so branding is a build-time constant, not a per-org
// database row: set BRAND_NAME/BRAND_TAGLINE in that client's .env before
// running `npm run build`, and it's baked into both the server-rendered and
// client bundles. See vite.config.ts for how these get defined, and
// public/brand-mark.png / the favicon files for the logo half of this.
export const BRAND_NAME = __BRAND_NAME__;
export const BRAND_TAGLINE = __BRAND_TAGLINE__;
export const BRAND_FULL = `${BRAND_NAME} ${BRAND_TAGLINE}`;

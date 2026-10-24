---
status: accepted
---

# The panel's Content Security Policy has no nonce, so that its pages keep their static shell

The Admin Panel sends one static Content Security Policy from `next.config.ts`, with `'unsafe-inline'` in `script-src` and `style-src`, rather than a nonce drawn on every request. A nonce needs every page rendered on request, and "Partial Prerendering (PPR) is incompatible with nonce-based CSP" (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md:391-397`, Next.js 16.4.2), while every page of the panel prerenders a static shell (`CLAUDE.md`, **Caching**). The policy still refuses scripts and connections to other origins, framing, `<base>` and `<object>`; against inline injection, the defense is React's escaping, with `react/no-danger` and `react/jsx-no-script-url` as lint errors. Decided by Gilles on 2026-10-24, while grilling #51.

## Considered Options

- **Nonces drawn in `proxy.ts`**, as the Next.js guide shows: a strict `script-src`, at the cost of the static shell on every page, and of a `proxy.ts` that does more than redirect.
- **Subresource Integrity** (`experimental.sri`, `content-security-policy.md:456-538`): it keeps static pages, but is experimental, and whether it covers the inline scripts of the RSC payload is unchecked.
- **No policy for the MVP**: nothing would refuse framing, or a script loaded from another origin.

## Consequences

- An injected inline script would run; an injected script from another origin would not.
- Previews serve the same policy, with the Vercel Toolbar turned off there, since it needs `https://vercel.live` in six directives (https://vercel.com/docs/vercel-toolbar/managing-toolbar, updated 2026-08-11).
- Moving to nonces later means rendering every page on request.

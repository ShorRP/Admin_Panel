---
paths:
  - "src/*/env.ts"
  - ".env.example"
  - "next.config.ts"
---

# Gotchas of the environment variables

- A variable only Production requires, such as `ALERT_WEBHOOK_URL` (**Variables**), fails nothing on a pull request, since its preview builds without it, then fails every production build once merged, while the site stays on its last good deployment and `Check` stays green: on 2026-10-30, removing it failed the production builds of 8fdd0fc, 17b742a and b04a87f, until it came back and a redeploy of b04a87f passed (#276). So after changing a variable in Vercel's dashboard, read the `Vercel` status of `main`'s next commit, or redeploy, since a variable reaches a deployment only at its build (inferred from that redeploy).

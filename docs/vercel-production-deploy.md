# Vercel production deploy fallback

If GitHub → Vercel auto-deploy webhook is flaky or disabled, this repo now has a fallback workflow:

- `.github/workflows/vercel-prod-deploy.yml`
- Trigger: every push to `main` (and manual run via `workflow_dispatch`)
- Action: POST to a Vercel **Deploy Hook URL** stored in GitHub secret `VERCEL_DEPLOY_HOOK_URL`

## Setup

1. In Vercel project settings, create a **Deploy Hook** for production.
2. In GitHub repository settings → Secrets and variables → Actions, add:
   - `VERCEL_DEPLOY_HOOK_URL=<your vercel deploy hook url>`
3. Push to `main` (or run workflow manually).

## Why this helps

Even if Vercel misses the Git provider webhook event, GitHub Actions will explicitly trigger a production deploy.

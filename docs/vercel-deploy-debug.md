# Vercel auto-deploy verification

## Where to check
- Vercel Dashboard → Project → **Deployments**

## Expected behavior
- After pushing a commit (or merging a PR) to the production branch, a **new deployment** should appear automatically in Deployments.

## If no deployment appears
1. Open Vercel Dashboard → Project → **Settings** → **Git** and confirm the GitHub repository is still connected.
2. In the same area, verify **Ignored Build Step** is empty.

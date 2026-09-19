# Setup — sync2 (udrop.com edition)

## Part A — GitHub Pages (the site)

1. Create a new GitHub repo, e.g. `sync2`.
2. Upload everything in this `site/` folder to the repo root (so `index.html` is at the top level).
3. Repo → **Settings → Pages** → Source: `Deploy from a branch`, branch `main`, folder `/ (root)`. Save.
4. Get your udrop.com API keys: log into udrop.com → account/developer area → generate `key1` and `key2` (64 chars each).
5. Repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `UDROP_KEY1` = your udrop.com API key 1
   - `UDROP_KEY2` = your udrop.com API key 2
6. Repo → **Actions** tab → find "Update tree.json" → click **Run workflow** once manually to test it. Check that `tree.json` got updated with your real files.
7. Your site is now live at `https://YOUR-USERNAME.github.io/sync2/`.

At this point the read-only tree works. Anyone can browse and download. Nobody can upload yet.
Note: udrop's folder listing doesn't return a date for individual files (only for folders), so file rows will show a blank date column — that's a limitation of their API, not a bug.

## Part B — Deno Deploy (the uploader backend)

1. Go to https://dash.deno.com → sign in with GitHub (no card needed).
2. Put `backend/main.ts` into its own small GitHub repo (e.g. `sync2-backend`), then in Deno Deploy choose "Deploy from GitHub repo", pick that repo, entry point `main.ts`.
3. In the Deno Deploy project → **Settings → Environment Variables**, add:
   - `MASTER_PASSWORD` = the code you want to type to unlock uploading
   - `UDROP_KEY1` / `UDROP_KEY2` = same as above
   - `ALLOWED_ORIGIN` = `https://YOUR-USERNAME.github.io`
   - (optional, for auto-refreshing the tree after upload) `GH_TOKEN` = a GitHub fine-grained personal access token scoped only to the `sync2` repo with "Actions: Read and write" permission, and `GH_REPO` = `YOUR-USERNAME/sync2`
4. Deploy. You'll get a URL like `https://sync2-backend.deno.dev`.
5. Back in your **site** repo, edit `config.js`:
   ```js
   window.BACKEND_URL = "https://sync2-backend.deno.dev";
   ```
   Commit. GitHub Pages redeploys automatically.

## Test it

- Visit your site. Click folders — they expand with `+`/`-` exactly like the example.
- Click a file — opens its udrop download link.
- Click "Upload" → enter your master code → choose a file → optionally type a folder id → Upload.
- Within ~30s, `tree.json` on GitHub should update (if you set `GH_TOKEN`/`GH_REPO`) and the new file will show up on next page load.

## Notes on security

- Your udrop API keys live only in: (a) GitHub Actions secrets, (b) Deno Deploy env vars. Neither is ever sent to a visitor's browser.
- The master password is checked **inside the Deno function**, not in the page's JavaScript, so it can't be read from "view source."
- If you ever suspect the password leaked, just change `MASTER_PASSWORD` in Deno Deploy — no redeploy of the site needed.

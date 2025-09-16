# SP1RL Viewer — Netlify-ready Next.js (App Router)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/nuzer05ive/TheGolden101.git)

> **How to use the button**
> 1) Push this folder to your own GitHub (public or private with Netlify GitHub app access).  
> 2) Replace `<YOUR_REPO_URL>` above with your repo URL, e.g. `https://github.com/yourname/sp1rl-next-netlify`.  
> 3) Click the button to create and configure the site automatically (build/publish settings are pre-configured).

## Run locally
```bash
npm i
npm run dev
# open http://localhost:3000
```

## Deploy to Netlify (Manual)
- Drag & drop this folder in Netlify, or
- Connect your repo in **New site from Git** with:
  - Build command: `npm run build`
  - Publish directory: `.next`
  - Plugin: `@netlify/plugin-nextjs` (already in `netlify.toml`)

## Deploy via Netlify CLI (optional)
```bash
# one-time
npm i -g netlify-cli
netlify login

# from project root
netlify init   # create a new site or link an existing one
npm run build
netlify deploy --build --prod --dir=.next
```

## Notes
- Uses browser Web Crypto for SHA-256 (no extra deps).
- Tailwind enabled. App Router. SSR disabled for the viewer via dynamic import.

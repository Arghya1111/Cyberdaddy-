# CyberDaddy Frontend — Deployment Guide

## Build Verified ✅

**Build date:** 2026-06-15  
**Build result:** `exit_code: 0` — 13/13 pages compiled, 0 TypeScript errors

---

## 1. Framework & Tooling

| Property | Value |
|---|---|
| Framework | Next.js 16.2.7 (App Router + Turbopack) |
| Runtime | React 19 |
| Package manager | npm |
| Build command | `npm run build` |
| Install command | `npm ci` |
| Output directory | `.next` |
| Node version | ≥ 18 (LTS recommended) |

---

## 2. Required Environment Variables

Set these in the **Vercel dashboard → Project Settings → Environment Variables**.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_GROQ_API_KEY` | **Required** | Groq API key for client-side AI chat and screenshot analysis. Get one at [console.groq.com](https://console.groq.com/keys). |
| `NEXT_PUBLIC_API_URL` | Optional | Override backend URL. **Leave blank in production** — the Next.js rewrite proxy handles routing to the backend without exposing the origin. |
| `NEXT_PUBLIC_APP_NAME` | Optional | Display name (default: `CyberDaddy`). Already set in `vercel.json`. |

> **Security note:** `NEXT_PUBLIC_*` variables are baked into the client bundle at build time and are visible to anyone who inspects the browser JS. Rotate `NEXT_PUBLIC_GROQ_API_KEY` regularly and apply usage limits in the Groq console.

---

## 3. Backend URL Configuration

The frontend communicates with the Django backend (`https://cyberdaddy.onrender.com`) via the **Next.js rewrite proxy** — no CORS headers or exposed backend URLs in client code.

### How it works

```
Browser → /api/v1/...  →  Next.js rewrite  →  https://cyberdaddy.onrender.com/api/v1/...
```

This means:
- The backend origin is **never exposed** to the browser (prevents direct attack surface).
- CORS is handled at the Next.js edge — no `CORS_ALLOW_ALL_ORIGINS` needed on Django.
- The rewrite is configured in **both** `next.config.ts` (dev) and `vercel.json` (production).

### To use a different backend

Set `NEXT_PUBLIC_API_URL=https://your-backend.com` in Vercel environment variables. The axios client in `src/lib/api.ts` will use this as the base URL instead of the proxy.

---

## 4. Vercel Settings

| Setting | Value |
|---|---|
| Root directory | `frontend/` |
| Framework preset | Next.js (auto-detected) |
| Build command | `npm run build` |
| Install command | `npm ci` |
| Output directory | `.next` |
| Node.js version | 20.x |

> If deploying from the repo root (monorepo), set **Root Directory = `frontend`** in Vercel project settings.

### `vercel.json` summary

- Rewrites `/api/v1/*` → `https://cyberdaddy.onrender.com/api/v1/*`
- Adds CORS headers for the `/api/*` path
- Sets `NEXT_PUBLIC_APP_NAME=CyberDaddy` at build time

---

## 5. Routes Deployed

| Route | Type | Description |
|---|---|---|
| `/` | Static | Auth redirect (→ `/dashboard` or `/login`) |
| `/login` | Static | Login form |
| `/register` | Static | Registration form |
| `/forgot-password` | Static | Placeholder page |
| `/dashboard` | Static | Analytics dashboard (fetches data client-side) |
| `/chat` | Static | AI chat with Groq |
| `/history` | Static | Paginated scan history |
| `/family` | Static | Family group management |
| `/profile` | Static | User profile & settings |
| `/settings` | Static | Notification preferences |

All routes are statically pre-rendered (SSG) with client-side data fetching — ideal for Vercel's global CDN.

---

## 6. Architecture Overview

```
Vercel (frontend)                     Render (backend)
┌────────────────────────────────┐    ┌──────────────────────────────┐
│  Next.js 16 App Router         │    │  Django REST Framework        │
│                                │    │                              │
│  Pages (SSG)                   │    │  /api/v1/users/              │
│  ├── AuthContext (JWT client)  │    │  /api/v1/scans/              │
│  ├── useApi hook               │    │  /api/v1/insights/           │
│  ├── src/lib/api.ts (axios)    │───▶│  /api/v1/family/             │
│  └── src/lib/apiServices.ts    │    │  /api/v1/notifications/      │
│                                │    └──────────────────────────────┘
│  Groq SDK (browser, direct)    │───▶  api.groq.com
└────────────────────────────────┘
```

**Auth flow:** JWT tokens stored in `localStorage`. `AuthGuard` component handles client-side route protection. Token expiry is checked before each request via the axios request interceptor.

---

## 7. Deploy Steps (Vercel CLI)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. From the repo root, link the project
vercel link

# 3. Set environment variables
vercel env add NEXT_PUBLIC_GROQ_API_KEY production
# → paste your Groq API key when prompted

# 4. Deploy to production
vercel --prod --cwd frontend
```

Or via the Vercel dashboard:
1. Import the GitHub repo
2. Set **Root Directory** = `frontend`
3. Add `NEXT_PUBLIC_GROQ_API_KEY` in Environment Variables
4. Deploy

---

## 8. Remaining Manual Actions

| Action | Priority | Notes |
|---|---|---|
| Set `NEXT_PUBLIC_GROQ_API_KEY` in Vercel | **Blocker** | App is non-functional without a valid Groq key |
| Set Render backend `CORS_ALLOWED_ORIGINS` | **Blocker** | Must include the Vercel deployment URL (e.g. `https://cyberdaddy.vercel.app`) |
| Set `NEXT_PUBLIC_API_URL` in Vercel (optional) | Optional | Only needed if bypassing the proxy |
| Implement real forgot-password flow | Low | Currently shows a placeholder page |
| Move Groq calls server-side | Security | Prevents Groq API key exposure in browser bundle |
| Add server-side auth middleware | Security | Current route protection is client-side only (flash of protected content possible) |
| Pin `NEXT_PUBLIC_API_URL` for Render cold starts | UX | Render free tier sleeps; login page already shows a 30s warning |

---

## 9. Local Development

```bash
# 1. Install dependencies
npm ci

# 2. Create .env.local from template
cp .env.example .env.local
# → edit .env.local and fill in NEXT_PUBLIC_GROQ_API_KEY

# 3. Start the dev server
npm run dev
# → http://localhost:3000

# 4. (Optional) Point to local Django backend
# Add to .env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:8000
```

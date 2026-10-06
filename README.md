# Stationery & Toys Library Shop (bilingual AR-first)

Full-stack bilingual (Arabic primary, English secondary) shop. **Phases 0–4 are done.**

## Environment for public links

`client/.env` needs `VITE_SITE_URL` (dev default `http://localhost:5173`; production: the real
domain). It builds absolute product/list links inside WhatsApp messages. WhatsApp buttons hide
automatically when `whatsappNumber` in store settings is empty, and the number is cleaned to
digits only before use.

## What was built

### Phase 0 — Frontend shell (client/)
- Vite + React + React Router + Tailwind (mobile-first, logical `ms-/me-/ps-/pe-/start-/end-` utilities, `rtl:rotate-180` for mirrored icons).
- `react-i18next` with `ar.json` / `en.json`; **no hardcoded UI text** in the shell.
- Routing: `/` → saved `localStorage('lang')` else `/ar`; all routes under `/:lang/` (`/ar/...`, `/en/...`); invalid prefix → `/ar`.
- URL prefix is the **source of truth**; `localStorage` is only read on `/` and written as a side effect on language switch.
- `<html lang/dir>` sync (`ar→rtl`, `en→ltr`), Cairo (AR) + Nunito (EN) via Google Fonts, `index.html` defaults `lang="ar" dir="rtl"`.
- Prefixed admin routes: `/ar/admin`, `/en/admin` (login/dashboard stubs; full dashboard is Phase 3).
- SEO: `react-helmet-async` per-page title/meta + `hreflang` (see `Home.jsx`); **Phase 5 TODO:** server-side OG tag injection (name, image, price, description in page language) for product/category URLs so WhatsApp previews work (needs SSR/prerender or Cloudflare worker — SPA meta alone won't render in scrapers).
- Shared utils: `arabicNormalize.js` (in sync with server), `formatPrice.js` (SYP symbol after, 0 decimals, western/arabic-indic digits), `whatsapp.js` (per-language messages).

### Phase 1 — Backend API (server/)
- Express REST + Mongoose models: `Admin`, `Category`, `Product`, `SupplyList`, `StoreSettings` (all content bilingual `{ar required, en optional→fallback ar}`).
- `Product.slug` unique (from English name via `slugifyEnglish`, else `product-<shortid>`; collision suffix `-2, -3…`); API `GET /api/products/:slug`, client `/:lang/products/:slug` — consistent.
- `isNewArrival` (not `isNew` — Mongoose reserves `isNew`).
- Arabic search: `searchIndex` (normalized `name+description`) rebuilt on save; query normalized + **regex-escaped** (`escapeRegExp`); `npm run reindex` (`server/scripts/reindex.js`) backfills after rule changes.
- Uploads: `multer` memory → Cloudinary or local disk abstraction; **only jpg/png/webp, max 5 MB**; DB stores URL/path only; `deleteStored()` runs when an image is removed from a product, a product/category is deleted, or `DELETE /api/upload` is called.
- Security: `helmet` (with `crossOriginResourcePolicy: cross-origin` so `/uploads` loads from Vite), `cors` (`CLIENT_URL`), `morgan`, `express-mongo-sanitize`, `express-validator`, login `rate-limit` (10/15 min).
- Fail-fast in production: missing/weak `JWT_SECRET` (<32 chars) or missing Cloudinary keys → `process.exit(1)`. Dev without Cloudinary → local `server/uploads` + warning.
- `seed/seed.js` **refuses in production**, reads admin from `ADMIN_USERNAME/ADMIN_PASSWORD`, ensures 5 categories + SYP `StoreSettings`. **Phase 2 will add sample products with realistic new-SYP prices (notebook ~25, pencil box ~60) + one supply list.**

## Setup

```powershell
# 1. MongoDB (dev, Docker)
docker run -d --name toyshop-mongo -p 27017:27017 -v toyshop-data:/data/db mongo:7

# 2. Backend
cd server
Copy-Item .env.example .env   # then edit MONGODB_URI=mongodb://localhost:27017/toyshop
npm install
npm run dev                   # http://localhost:5000/api/health

# 3. Frontend
cd ../client
Copy-Item .env.example .env
npm install
npm run dev                   # http://localhost:5173/ -> redirects to /ar
```

## API quick reference

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | /api/auth/login | rate-limited | `{username,password}` → `{token}` |
| GET | /api/auth/me | admin | |
| GET | /api/categories | — | sorted |
| POST/PUT/DELETE | /api/categories | admin | blocks delete when products use it |
| GET | /api/products?... | — | `search,category(id\|slug),minPrice,maxPrice,ageMin,ageMax,inStock,isNewArrival,sort,page,limit` |
| GET | /api/products/new | — | `isNewArrival` OR created ≤30d |
| GET | /api/products/:slug | — | |
| POST/PUT/DELETE | /api/products | admin | `:id` for PUT/DELETE |
| GET | /api/supply-lists, /:id | — | includes `totalPrice` |
| POST/PUT/DELETE | /api/supply-lists | admin | |
| GET / PUT | /api/settings | PUT admin | singleton |
| POST / DELETE | /api/upload | admin | field `images` (≤8); DELETE body `{url}` |

## Verification (done before handoff)
- `npm install` passes in `server/` and `client/`.
- `GET /api/health` → `{ok:true, db:"connected"|"disconnected", dbError:<short message or null>}` (works even when Mongo is down — the server listens first and retries the DB every 10s).
- Client `/` → `/ar` (RTL), switcher → `/en` (LTR), reload persists via URL; direct `/en/products?sort=price-asc` works (shareable query params in Phase 4 listing).

## Deployment

Architecture: **Northflank** (API container, `server/`) + **Atlas M0** (MongoDB) + storefront host **TBD**.
The API trusts one proxy hop (`app.set("trust proxy", 1)`) so the login rate limiter
sees real client IPs behind the platform proxy. Requires **Node 20+** (`engines` in `server/package.json`).

### 1. Database (Atlas M0)
- Create a free M0 cluster, a database user, and allow the platform's IPs (or 0.0.0.0/0 for simplicity).
- Note the connection string: `mongodb+srv://<user>:<pass>@<cluster>/toyshop-prod`.

### 2. API on Northflank (Dockerfile build)
- New **service** from the repo (`main` branch), **build context `server/`**, Dockerfile build
  (`server/Dockerfile`: `node:20-slim`, `npm ci --omit=dev`, runs as the `node` user).
- Container port **8080**; the image sets `PORT=8080` via `ENV`, and the server listens on
  `process.env.PORT`, so also set a `PORT=8080` env var on the service to be explicit.
- Health check path: `/api/health` (returns `{ok:true, db, dbError}`; stays 200 while the DB reconnects).
- Set `NODE_ENV=production` (activates fail-fast checks: strong `JWT_SECRET` required,
  Cloudinary keys required — the service refuses to boot without them).
- `.dockerignore` keeps `node_modules`, `.env`, `uploads`, `.git`, logs, and `dist` out of the image.
  Local `/uploads` only exists as a dev fallback: outside production the server creates the
  folder on startup if missing; in production the static route is skipped (Cloudinary-only).
- Environment variables (see `server/.env.example`):

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | Atlas URI, e.g. `mongodb+srv://<user>:<pass>@<cluster>/toyshop-prod` |
| `NODE_ENV` | yes | `production` |
| `PORT` | yes | `8080` (matches the Dockerfile `EXPOSE`) |
| `JWT_SECRET` | yes | Random string, **min 32 chars** (boot fails otherwise) |
| `JWT_EXPIRES_IN` | no | Default `8h` |
| `CLIENT_URL` | yes | Prod storefront origin(s), comma-separated, e.g. `https://shop.example.com` (CORS) |
| `CLOUDINARY_CLOUD_NAME` | yes (prod) | Image storage (no local-disk fallback in production) |
| `CLOUDINARY_API_KEY` | yes (prod) | |
| `CLOUDINARY_API_SECRET` | yes (prod) | |
| `ADMIN_USERNAME` | bootstrap only | Initial admin for the base seed |
| `ADMIN_PASSWORD` | bootstrap only | Initial admin password for the base seed |

- **Bootstrap once** via the service shell/terminal (prints the database it will modify, requires `--force`):
  `npm run seed -- --base-only --force` → creates admin (from env), 5 categories, SYP store settings.
  Full sample fixtures are **always refused** in production, even with `--force`.

### 3. Storefront (host TBD)
- The frontend host is **still to be decided**. Whichever static host is chosen, it must rewrite
  every path to `/index.html` (see `client/vercel.json` for the Vercel form of this rule), so
  refresh on `/ar/products` (or any deep link) serves the SPA instead of 404.
- Environment variables (see `client/.env.example`):

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | yes | Public API base, e.g. `https://<api-host>/api` |
| `VITE_SITE_URL` | yes | Public storefront origin, e.g. `https://shop.example.com` (absolute links in WhatsApp messages) |

- After deploy, set the API's `CLIENT_URL` to the storefront domain and redeploy the API.

### 4. Post-deploy checklist
- `GET https://<api>/api/health` → `{ok:true, db:"connected", dbError:null}` (if `db:"disconnected"`, read `dbError` — the server keeps retrying every 10s).
- Open `https://<shop>/` → redirects to `/ar` (RTL); switcher → `/en` (LTR).
- Log in at `/ar/admin` with the bootstrap admin, change the password immediately
  (admin settings → change password), then remove/rotate `ADMIN_PASSWORD`.
- Upload a product image (proves Cloudinary), place a test WhatsApp order.
- Optional: `npm run reindex` (safe anytime — derived fields only),
  `npm run cleanup-orphans` (dry run; local-disk uploads only).

# Aperture Goods — E-commerce Starter

React + Node.js/Express + PostgreSQL + Auth0 + Stripe, built with security as a first-class requirement, not an afterthought.

```
ecommerce-app/
  server/     Express API (products, checkout, orders, Stripe webhook)
  client/     React storefront (product listing, cart, Stripe checkout)
```

## How the pieces fit together

1. **React frontend** shows products (public) and lets users add to cart (stored locally).
2. **Auth0** handles login/signup. We never see, store, or hash a customer's password ourselves — Auth0's hosted login page does that, and hands our frontend a signed JWT.
3. On checkout, the **frontend sends only `{ productId, quantity }`** to the backend — never a price. The frontend also attaches the Auth0 access token so the backend knows who's asking.
4. **Node/Express backend** verifies that token, looks up real prices in **PostgreSQL**, and creates a **Stripe Checkout Session** with the server-confirmed total.
5. Stripe hosts the actual card payment page — your server and database never touch a raw card number.
6. Stripe calls your backend's `/webhook` endpoint when payment truly succeeds. That webhook (signature-verified) is the *only* thing that marks an order "paid" — not the browser redirect, which can't be trusted alone.

## About passwords and Auth0

You asked for both bcrypt-hashed passwords and Auth0. In practice you only need one: since Auth0 owns the login flow, **Auth0 already hashes and stores customer passwords securely on its side** — your database never holds a password at all (see `orders.auth0_user_id`, which just stores Auth0's user identifier). I've left a small `server/utils/passwordHash.js` bcrypt helper in the project, unused by the main flow, only in case you later add a *separate* local login (e.g. an internal admin panel that doesn't go through Auth0). If you stay fully on Auth0, you can delete that file.

---

## 1. Prerequisites

- Node.js 18+ and npm
- A PostgreSQL database (local install, or a free hosted one — Neon, Railway, Supabase all work)
- A free [Auth0](https://auth0.com) account
- A free [Stripe](https://stripe.com) account (test mode)

## 2. Set up Auth0

1. Auth0 Dashboard → **Applications** → Create Application → **Single Page Application** (this is your React app).
   - Allowed Callback URLs: `http://localhost:3000`
   - Allowed Logout URLs: `http://localhost:3000`
   - Allowed Web Origins: `http://localhost:3000`
   - Copy the **Domain** and **Client ID** into `client/.env`.
2. Auth0 Dashboard → **Applications → APIs** → Create API (this represents your backend).
   - Give it an identifier, e.g. `https://ecommerce-api` — this is your `AUTH0_AUDIENCE`.
   - Copy this into both `server/.env` (`AUTH0_AUDIENCE`) and `client/.env` (`REACT_APP_AUTH0_AUDIENCE`).
   - Copy your Auth0 domain (with `https://` and trailing `/`) into `server/.env` as `AUTH0_ISSUER_BASE_URL`.

## 3. Set up Stripe

1. Stripe Dashboard → **Developers → API keys** → copy the **Secret key** (test mode) into `server/.env` as `STRIPE_SECRET_KEY`.
2. For webhooks locally, install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:
   ```
   stripe listen --forward-to localhost:4000/webhook
   ```
   It will print a webhook signing secret (`whsec_...`) — put that in `server/.env` as `STRIPE_WEBHOOK_SECRET`.
3. In production, instead create a real webhook endpoint in Stripe Dashboard → **Developers → Webhooks**, pointing at `https://your-backend-domain/webhook`, subscribed to the `checkout.session.completed` event — then use *that* signing secret.

## 4. Set up the database

```bash
createdb ecommerce                      # or use your hosted provider's dashboard
psql "$DATABASE_URL" -f server/db/schema.sql   # run this as an admin/owner role
```

This creates the `products`, `orders`, and `order_items` tables, inserts three sample products, **creates a least-privilege `app_user` role, and enables Row Level Security (RLS)**.

Two things you must do after running it:

1. **Change the placeholder password.** `schema.sql` creates `app_user` with password `CHANGE_ME_TO_A_STRONG_PASSWORD` — replace it before running, or run `ALTER ROLE app_user PASSWORD '...'` with a real strong password afterwards.
2. **Point `DATABASE_URL` at `app_user`, not the admin/owner role.** RLS is silently bypassed by Postgres superusers and by any role with `BYPASSRLS` — so the app must connect as `app_user`, e.g. `postgresql://app_user:yourpassword@host:5432/ecommerce`.

### Row Level Security (RLS) — what it does here

- `orders` and `order_items` have RLS **enabled and forced**, with a policy that only allows a row through if `auth0_user_id` matches the current request's logged-in user (`server/config/db.js` sets this via `withUserContext()` before every user-scoped query).
- This means even if a future route handler forgot a `WHERE` clause, Postgres itself — not just app code — refuses to return or modify another user's orders.
- The Stripe webhook (`routes/webhook.js`) isn't tied to a browser user, so it uses `withServiceContext()` instead — a separate, narrowly-scoped trusted path, gated by Stripe's signature verification rather than a user session.
- `products` also has RLS enabled: anyone can `SELECT` (it's a public catalog), but only the service context can insert/update it.

### Keep PostgreSQL off the public internet

The database should only ever be reachable from your backend, never directly from the internet:

- **Local dev:** Postgres bound to `localhost` is already internal-only — nothing to configure.
- **Railway/Render/most PaaS providers:** use the **private/internal networking URL** between your backend service and the Postgres service (both in the same project), not the public proxy hostname. Most providers only expose a public endpoint if you explicitly enable it — leave that off, or restrict it to your own IP if you occasionally need direct `psql` access.
- **AWS RDS / self-managed:** put the database in a **private subnet** with a security group that allows inbound port 5432 *only* from your backend's security group/IP — never `0.0.0.0/0`. Don't mark the instance "publicly accessible."
- If you need one-off admin access (running `schema.sql`, inspecting data), do it from a machine already inside that private network (e.g. temporarily allow your current IP, or use the provider's web-based SQL console), then close it back up.

## 5. Run locally

```bash
# Backend
cd server
cp .env.example .env      # then fill in real values
npm install
npm run dev                # http://localhost:4000

# Frontend (in a second terminal)
cd client
cp .env.example .env      # then fill in real values
npm install
npm start                  # http://localhost:3000
```

---

## Security checklist — what's already implemented, and why

| Requirement | Where | How |
|---|---|---|
| HTTPS/SSL | Deployment config | Enforced by host (Vercel/Railway auto-provision TLS certs — see deployment section) |
| Passwords never stored/hashed by us | Auth0 | Auth0 owns login; we only ever hold a JWT, never a password |
| Backend input validation | `server/middleware/validators.js` | `express-validator` re-checks every field server-side, regardless of frontend checks |
| SQL injection prevention | `server/routes/*.js` | Every query uses parameterized `$1, $2...` placeholders — no string concatenation |
| Secrets never in code | `.env` + `.env.example` | Real keys live only in `.env` (gitignored); example files show only placeholders |
| Auth via managed provider | `server/middleware/checkJwt.js`, `client/src/auth/` | Auth0 SDK + JWT verification, industry-audited rather than custom-built |
| Payments never touch our server | `server/routes/checkout.js`, `client/src/pages/Cart.js` | Stripe's hosted Checkout page collects the card; we only ever see a session ID |
| Payment confirmation trust boundary | `server/routes/webhook.js` | Only the signature-verified webhook marks an order "paid" — never the browser redirect |
| Secure HTTP headers | `server/server.js` | `helmet()` sets CSP, X-Frame-Options, etc. |
| Rate limiting | `server/server.js` | General API limiter + a stricter one on `/api/checkout` |
| Least privilege | `server/routes/orders.js` | A user's orders are looked up only by their own verified Auth0 id, never a client-supplied id |
| Frontend never touches the database | `client/src/` | The React app only ever calls the Express API over HTTPS — it holds no DB connection string or credentials at all |
| Row Level Security (RLS) | `server/db/schema.sql`, `server/config/db.js` | Enforced by Postgres itself, not just app code — enabled with `FORCE` so even the table owner can't bypass it |
| Least-privilege DB role | `server/db/schema.sql` (`app_user`) | The app connects as a non-superuser role with no `BYPASSRLS`, so RLS policies can't be silently skipped |
| Database not internet-facing | Hosting/network config (see "Keep PostgreSQL off the public internet" below) | Backend reaches Postgres over a private/internal network only; port 5432 is never opened to `0.0.0.0/0` |

### Still worth doing before real launch
- Rotate your Stripe/Auth0 keys if they're ever accidentally exposed (e.g. committed to Git by mistake).
- Add automated PostgreSQL backups (your host's dashboard, e.g. Railway/Render, usually has a one-click option).
- Add server-side logging/alerting (e.g. Sentry) so errors don't go unnoticed.
- Add a Privacy Policy and Terms of Service page — likely legally required once you collect user data and payments.

---

## 6. Deployment

**Recommended split: React frontend on Vercel, Node/Postgres backend on Railway.**

Why this split, not "everything on one platform":
- Vercel is built for static/serverless frontends — perfect for the React app, free HTTPS, instant global CDN.
- Your Express backend needs a long-running, always-on process (it holds a PostgreSQL connection pool and needs to reliably receive Stripe webhooks) — that's exactly what Railway (or Render) is designed for, and both offer a managed PostgreSQL add-on in the same project.
- Trying to force the Express/Postgres backend onto a pure-serverless platform adds unnecessary complexity around cold starts and connection pooling for little benefit here.

### Deploy the backend (Railway)
1. Push the `server/` folder to a GitHub repo.
2. Railway → New Project → Deploy from GitHub repo.
3. Add a PostgreSQL plugin in the same Railway project — it gives you a `DATABASE_URL` automatically.
4. In Railway's Variables tab, set all the values from `server/.env.example` (using the real Auth0/Stripe values, and Railway's own `DATABASE_URL`; set `PG_SSL=true`).
5. Once deployed, run the schema against Railway's Postgres: `psql "$RAILWAY_DATABASE_URL" -f server/db/schema.sql`.
6. Note your Railway backend URL (e.g. `https://your-app.up.railway.app`) — set it as the Stripe webhook endpoint (`/webhook`) and as `REACT_APP_API_URL` for the frontend.

### Deploy the frontend (Vercel)
1. Push the `client/` folder to a GitHub repo (or the same repo, different root directory).
2. Vercel → New Project → import the repo, set root directory to `client`.
3. Add the environment variables from `client/.env.example` (real Auth0 values, and `REACT_APP_API_URL` = your Railway backend URL).
4. Deploy — Vercel gives you HTTPS automatically.
5. Go back to Auth0 and Railway's `CLIENT_URL` env var, update the allowed URLs/CORS origin to your real Vercel domain (not just `localhost`).

Both platforms auto-redeploy on every `git push`, and both provision free, automatic HTTPS certificates — so "SSL/HTTPS" from your checklist is handled by the hosting platform itself once deployed; you don't need to manage certificates by hand.

---

## 7. Enterprise Features — what's been added, and how to turn each one on

Everything below is already coded into the project. Most need one small setup step (an env var, an Auth0 dashboard action) before they do anything — nothing is silently active by default, and nothing breaks if you skip a step; it just stays off.

### Operational Excellence

**Centralized logging & error monitoring (Sentry)**
- Sign up free at [sentry.io](https://sentry.io), create a Node project and a React project.
- Backend: put the Node project's DSN in `server/.env` as `SENTRY_DSN`.
- Frontend: put the React project's DSN in `client/.env` as `REACT_APP_SENTRY_DSN`.
- Leave either blank and that side simply doesn't send anything — no crash, no-op.

**Infrastructure as Code**
- `server/railway.json` now defines the build/start commands and restart policy as code — Railway reads it automatically, so a fresh Railway project set up from this repo behaves identically without you re-clicking settings.

**Automated backups / managed database**
- Not something this repo can turn on for you — it's a setting in Railway's Postgres service (Settings → Backups) or a plan choice on Neon/Supabase/RDS. Enable it once you deploy; it's usually one click.

**CDN**
- Already covered — Vercel serves the whole frontend build through its CDN automatically.

**CI/CD**
- `.github/workflows/ci.yml` now runs backend tests (`server/tests/`) and a frontend build check on every push/PR. `.github/dependabot.yml` opens automatic PRs when a dependency has a known vulnerability. Both work as soon as this repo is pushed to GitHub — no extra setup.

### Enterprise Features

**Role-Based Access Control (RBAC)**
1. Auth0 Dashboard → User Management → Roles → create `admin` (and `inventory_manager`/`support` if you want them later).
2. Assign the `admin` role to your own user under Users → (your user) → Roles.
3. Auth0 Dashboard → Actions → Flows → Login → add a Action with this code, then drag it into the Login flow:
   ```js
   exports.onExecutePostLogin = async (event, api) => {
     const roles = event.authorization?.roles || [];
     api.idToken.setCustomClaim('https://aperturegoods.com/roles', roles);
     api.accessToken.setCustomClaim('https://aperturegoods.com/roles', roles);
   };
   ```
4. Log out and back in — your token now carries the role, `/admin/products` and `/admin/analytics` become visible in the navbar, and the backend's `requireRole('admin')` middleware (already applied to `/api/admin/*`) starts enforcing it.

**Advanced product management**
- `product_variants` table (size/color/material) is in the schema, with a public read endpoint at `GET /api/products/:id/variants`.
- Bulk stock updates: `POST /api/admin/products/bulk-stock` with `{ "csv": "id,stock\n1,20\n2,5" }`.
- Low-stock alerts: `server/jobs/lowStockAlert.js` runs daily and logs products under `LOW_STOCK_THRESHOLD` (set in `.env`, default 5) — wire the `TODO` in that file up to an email/Slack call when you're ready.

**CRM, multi-currency, deeper localization**
- CRM: rather than building one, integrate an existing tool (HubSpot Free, Customer.io) via their API once you have real customers — not something to build from scratch in this repo.
- Multi-currency: Stripe already accepts a `currency` per Checkout line item (`routes/checkout.js` already passes `product.currency` through) — add more currency columns/logic once you actually need a second currency.
- Localization: `client/src/i18n.js` + `client/src/locales/en.json` / `si.json` are wired in now (see the language switcher in the footer) — add more keys/languages the same way.

**Analytics & reporting**
- `GET /api/admin/analytics/sales?days=30` and `/conversion` power the chart at `/admin/analytics` (built with `recharts`).
- `GET /api/admin/analytics/abandoned-carts` reads from the new `carts` table — note the frontend doesn't yet sync cart state to that table (it still only uses `localStorage`); wiring that sync is the next step if you want abandoned-cart data to actually populate.
- For visitor-level analytics (not just sales), set `REACT_APP_GA_ID` in `client/.env` to enable Google Analytics — it silently does nothing if left blank.

### Security & Performance

**Caching (Redis)**
- Railway → your project → **+ New → Database → Add Redis** → copy the connection URL into `server/.env` as `REDIS_URL`.
- `routes/products.js` now caches the product listing for 60 seconds when Redis is configured, and falls back to querying Postgres directly if it isn't.

**GDPR — delete my account**
1. Auth0 Dashboard → Applications → Create Application → **Machine to Machine**.
2. Authorize it for the **Auth0 Management API**, grant it the `delete:users` scope.
3. Put its Client ID/Secret into `server/.env` as `AUTH0_M2M_CLIENT_ID` / `AUTH0_M2M_CLIENT_SECRET`.
4. The `/delete-account` page (linked in the footer) now calls `DELETE /api/account`, which anonymizes the user's past orders (kept for tax records) and deletes their actual Auth0 identity.

**Privacy Policy / Terms of Service**
- Placeholder pages exist at `/privacy` and `/terms` (linked in the footer) — replace the placeholder copy with real, lawyer-reviewed text before you actually launch. These are a legal document, not something to ship with placeholder text.

**Rate limiting, TLS, RLS, least-privilege DB role**
- Already covered earlier in this README (section on security checklist) — unchanged.

**Regular security audits**
- `npm audit` — run manually any time: `cd server && npm audit`, `cd client && npm audit`.
- GitHub Dependabot is now configured (`.github/dependabot.yml`) and works automatically once this repo is on GitHub.
- Full penetration testing is a service you hire out once you have real revenue/user data at meaningful scale — not something this repo can automate for you.

### What's genuinely an organizational decision, not code

A few items from an enterprise checklist are decisions about *which vendor/process to adopt*, not something a codebase can implement on its own — being upfront about this rather than faking it:
- **Terraform/full IaC** — worth a dedicated infra repo once you have staging + production environments to keep in sync; overkill for a single Railway/Vercel project today.
- **CRM platform choice** — pick a vendor (HubSpot, Customer.io, etc.) based on your actual sales process; there's no generically "correct" one to hardcode.
- **Managed DB migration (RDS/Supabase with read replicas)** — a scaling decision you make when Railway Postgres's single instance actually becomes a bottleneck, not before.
- **Formal penetration testing** — requires hiring a firm; automate what you can first (Dependabot, `npm audit`, RLS, rate limiting — all already in place) and get a real audit once there's real money/data on the line.

---

## 8. Visual redesign — Tailwind CSS + the Aperture identity

The frontend now uses **Tailwind CSS** instead of the earlier plain `styles.css` (which no longer exists — everything is Tailwind utility classes now). Since "Aperture" is a photography/optics term, the brand identity leans into that: a dark charcoal (`ink`) + warm brass accent palette, Space Grotesk/Inter type pairing, and a six-bladed aperture-iris mark (`components/ApertureMark.js`) used as the logo, a hero backdrop element, and a decorative motif — a real signature tied to the store's name rather than a generic accent color.

**New sections, all on one scrollable page (`/`), reached via smooth-scroll nav links instead of separate routes:**
- Hero (`#home`), Shop (`#shop` — full catalog grid), About (`#about`), FAQ (`#faq`), Contact (`#contact`)
- Clicking a nav link (`Link to="/#shop"` etc.) scrolls to that section — from any page. `pages/Home.js` watches the URL hash and handles the actual scrolling, including the case of navigating there fresh from `/cart` or a product page.
- Everything transactional still has its own real route since it doesn't make sense as a scroll-past section: `/cart`, `/products/:id`, `/admin/*`, `/privacy`, `/terms`, `/delete-account`.
- The navbar itself (the dark pill bar, logo, cart/login buttons) is unchanged — only what its middle links point to changed, from routes to in-page anchors.

**Also fixed:** cart items used to survive logout, so the next person on a shared browser (or your own next session) would see a leftover cart. The logout button (`components/Navbar.js`) now calls `clearCart()` immediately before the Auth0 logout redirect.

**Local setup:** since Tailwind was added, run `npm install` again in `client/` to pick up `tailwindcss`, `postcss`, and `autoprefixer` — `tailwind.config.js` and `postcss.config.js` are already in the repo and CRA picks them up automatically, no extra config needed.

**Catalog:** `db/schema.sql` now seeds 10 sample products instead of 3 — re-run it (it's still `INSERT ... ON CONFLICT DO NOTHING`, so existing rows aren't touched, only new ones get added) if you want the fuller catalog locally.

The legal pages (`/privacy`, `/terms`, `/delete-account`) got a lighter Tailwind pass for consistency, not a full redesign — they're compliance pages rather than storefront pages, so the design effort went where a customer actually sees it. The admin area got its own full treatment — see section 9 below.

---

## 9. Admin dashboard, storefront search, and scroll animations

### Admin dashboard (`/admin`)
A real sidebar + topbar admin console (`components/AdminLayout.js`), separate from the storefront nav — Dashboard, Products, Orders, Customers, Chat, Email, Account, Settings, Log out. Every number on the Dashboard page comes from a real query against `orders`/`order_items`/`products` (`server/routes/dashboard.js`'s single `GET /api/admin/dashboard` call) — nothing is a placeholder figure:
- **Product overview** — all-time paid total + orders in the last 30 days
- **Active sales** — last 30 days revenue vs. the 30 days before, with a 7-day mini bar chart
- **Product revenue** — this calendar month vs. last month
- **Analytics** — a 30-day revenue line chart, plus a Sales Performance radial gauge showing real conversion rate (paid ÷ started orders)
- **Top products** — actual best-sellers by revenue, joined from `order_items`

**Orders** and **Customers** pages list real data too (`GET /api/admin/orders`, `GET /api/admin/customers` — the latter aggregated from order history, since there's no separate customer-profile table; Auth0 owns identity). **Chat** and **Email** are placeholder pages that say plainly there's no messaging/email backend wired up, rather than faking data — wire in a real provider (Intercom/Crisp for chat, Resend/SendGrid for email) when you need those for real.

### Search
The storefront navbar (`components/Navbar.js`) has a real search — it hits `GET /api/products?search=` (case-insensitive name match) and scrolls to the Shop section with results. The admin topbar search filters the Products table the same way.

### Scroll animations
`components/Reveal.js` is a small wrapper (built on `framer-motion`) that fades/slides/un-blurs each section into place the first time it scrolls into view, plus a subtle entrance animation and ambient gradient drift on the Hero. Everything respects `prefers-reduced-motion` — it falls back to a plain, static render for anyone with that OS setting on.

**Local setup:** run `npm install` again in `client/` to pick up `framer-motion` and `lucide-react` (icons used throughout the admin console).

### Fixed: deleting a product with real order history
Postgres correctly refused to delete a product that `order_items` still references (that's the foreign key doing its job — deleting it would corrupt real order records). `products` now has an `is_active` column: `DELETE /api/admin/products/:id` tries a real delete first, and only falls back to `is_active = false` (hides it from the storefront, keeps the row and order history intact) if Postgres rejects the delete with a foreign-key violation. Run `db/schema.sql` again to pick up the new column (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, safe on an existing database). The Products admin page now shows a status badge and a "Reactivate" button for hidden products.


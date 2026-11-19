# CoreMan — Development Roadmap

_Last reviewed: 19 Nov 2026_

This plan is based on a review of the current code (Spring Boot API + React storefront) and on what shoppers in Bangladesh expect from a fashion store. Work is grouped into phases; each phase is shippable on its own.

---

## Where things stand

**Working today:** browsing, category tree + mega menu, search, product detail with size/colour, cart, checkout with address, order history, admin CRUD for products/categories/orders, JWT auth with roles.

**Built in the backend but not wired up in the frontend**

| Gap | Detail |
|---|---|
| Wishlist | `/api/wishlist` exists, but the navbar heart links to `/wishlist` (no such route) and the heart on product cards does nothing. |
| Reviews | `/api/products/{slug}/reviews` exists; product page shows a rating but customers can't read or write reviews. |
| Shop filters | Menu links pass `gender`, `sort`, `featured`, `sale`, but `GET /api/products` only takes paging. `gender` is filtered in the browser on the current page of 12 only (so pages come back short or empty as the catalogue grows); `sort`, `featured` and `sale` are ignored, so "New Arrivals", "Best Sellers" and "Sale" show every product. |
| Payments | Stripe is a dependency and `/api/payments/webhook` is whitelisted, but there is no payment controller and checkout has no payment step. |
| Footer pages | About, Careers, Contact, Shipping, Returns all link to `#`. |

**Housekeeping**

- `frontend/src/main.ts` and `frontend/src/style.css` are leftovers from the Vite template — delete them.
- `AdminPage.css` defines global `.btn-primary` and `.badge`; once the admin page loads, these restyle buttons site-wide. Scope them under `.admin-page`.
- Supabase project URL/key are hard-coded in `frontend/src/api/supabase.js`; move to `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` so local dev can use a separate bucket.
- Make sure `JWT_SECRET` is set in production and the seeded `admin123` password has been changed.

---

> **Update 20 Nov 2026 — Phase 1 is done**, plus Cash on Delivery from Phase 2 and sale prices from Phase 3.
> The gaps and housekeeping items listed above are fixed: filters & sorting API + sidebar, wishlist page,
> reviews (verified buyers only), COD checkout with phone number, footer pages (`/pages/...`), template
> files removed, admin CSS scoped, Supabase keys moved to env vars, 401 vs 403.
> Also fixed along the way: orders could use another customer's saved address; an expired access token
> logged people out on page load even with a valid refresh token; COD orders now become **Paid** when
> marked Delivered. Still open from the list above: change `JWT_SECRET` and the seeded admin password in production.
> Store contact details go in `frontend/src/siteInfo.js`.

## Phase 1 — Make what exists work (1–2 weeks) ✅

Goal: no dead links, no filters that silently do nothing.

1. **Product filtering & sorting API** — add `gender`, `category`, `minPrice`, `maxPrice`, `size`, `color`, `featured`, `sort` (newest, price ↑/↓, popular) to `GET /api/products` using JPA Specifications.
2. **Shop page filter sidebar** — size, colour, price range, sort dropdown; keep filters in the URL so links are shareable.
3. **Wishlist page** — `/wishlist` route; working heart toggle on product cards and the detail page.
4. **Reviews UI** — list + star breakdown on product page; "write a review" for customers with a delivered order of that product.
5. **Static pages** — About, Contact, Shipping policy, Return/Exchange policy, Size guide, FAQ, Privacy, Terms (needed anyway for payment-gateway approval).
6. Housekeeping items above.

## Phase 2 — Payments & delivery for Bangladesh (2–3 weeks)

Goal: take real money the way local customers prefer to pay.

1. **Cash on Delivery** as a first-class option (still the most-used method for fashion in BD), with an optional advance for delivery charge.
2. **SSLCommerz** (covers cards, bKash, Nagad, Rocket, net banking in one integration) — or direct **bKash** checkout. Replace the unused Stripe dependency.
3. **Delivery zones** — Inside Dhaka / Outside Dhaka shipping rates and estimated delivery days; district/thana dropdowns in the address form.
4. **Courier integration** — Steadfast, Pathao or RedX API: create a parcel from the admin order screen, store the tracking ID, show tracking to the customer.
5. **Order notifications** — SMS (via a BD SMS gateway) and email on order placed / confirmed / shipped / delivered.
6. **Phone-number login with OTP** — most BD shoppers prefer phone over email.

## Phase 3 — Conversion boosters (2–3 weeks)

1. **Coupons & discounts** — percentage/fixed codes, minimum order, expiry, per-user limit; deliver the "15% off first order" promised on the homepage.
2. **Sale pricing** — `compareAtPrice` on products to show strike-through prices and a real "Sale" collection.
3. **Guest checkout** — let people order with just name, phone, address.
4. **Size guide** modal per category, plus "fits true to size" from reviews.
5. **Stock urgency & back-in-stock alerts** — "Only 3 left", "Notify me" on sold-out sizes.
6. **Recently viewed** and **"You may also like"** (same category) on product pages.
7. **Mini-cart drawer** — add-to-cart opens a side drawer instead of a page jump.
8. **Free-shipping progress bar** in the cart ("Add ৳350 more for free shipping").

## Phase 4 — Growth & operations (ongoing)

1. **SEO** — server-rendered or pre-rendered product pages, meta tags, Open Graph images for Facebook sharing, sitemap, product structured data.
2. **Analytics** — Meta Pixel + Conversions API (most BD fashion traffic comes from Facebook/Instagram), GA4 e-commerce events.
3. **Admin upgrades** — sales chart, low-stock alerts, bulk product import (CSV), order search/filter, printable invoice & packing slip, customer list.
4. **Returns/exchanges flow** — customer requests from the order page; admin approves.
5. **Loyalty points / referral** codes.
6. **Image optimisation** — resize/WebP on upload, lazy loading, CDN.
7. **Bangla language toggle**.

## Engineering foundations (run alongside every phase)

- **Tests** — there are none yet. Start with service-layer tests for orders, stock and auth; add Playwright smoke tests for browse → cart → checkout.
- **CI** — GitHub Actions: build backend, run tests, build frontend on every PR.
- **Database migrations** — replace `ddl-auto: update` + `schema.sql` with Flyway so production schema changes are versioned.
- **Security** — rate-limit login/register, return 401 (not 403) for missing tokens, consider httpOnly refresh-token cookie instead of `localStorage`.
- **Error monitoring** — Sentry (frontend + backend).

---

## Suggested order

| # | Item | Why first |
|---|---|---|
| 1 | Filters + sorting API & UI | Menu links are currently misleading |
| 2 | Wishlist + reviews UI | Backend already done — quick wins |
| 3 | COD + delivery zones | Needed to take real orders |
| 4 | SSLCommerz / bKash | Online payment |
| 5 | Courier + SMS notifications | Cuts manual work per order |
| 6 | Coupons, sale prices, guest checkout | Direct conversion lift |
| 7 | SEO + Meta Pixel | Makes ad spend measurable |

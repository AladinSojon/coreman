# CoreMan — Feature Summary

**Live:** [coreman-udnt.vercel.app](https://coreman-udnt.vercel.app) (Frontend) · [coreman-production.up.railway.app](https://coreman-production.up.railway.app) (API)

---

## 🛍️ Storefront (Customer-Facing)

| Feature | Description |
|---------|-------------|
| **Homepage** | Hero banner, featured products, category highlights |
| **Mega Menu Navigation** | Hover-based dropdown showing Menswear & Womenswear with nested subcategories |
| **Shop Page** | Browse by category with subcategory cards, product grid, pagination |
| **Product Detail** | Image gallery, color/size picker, quantity selector, add to cart |
| **Search** | Full-text search across product name, description, and brand |
| **Cart** | Add/remove items, quantity controls, order summary with BDT pricing |
| **Checkout** | Shipping address form (BD-localized, no state field), order placement |
| **Orders Page** | View order history with status and totals |
| **Auth** | Register, login, JWT access/refresh tokens with auto-refresh on expiry |

## 🔧 Admin Panel (`/admin`)

| Feature | Description |
|---------|-------------|
| **Dashboard** | Stats cards — total users, products, orders |
| **Orders Tab** | View all orders with status badges, customer info, payment status. Click to expand order items + shipping address. Dropdown to update status (Pending → Confirmed → Shipped → Delivered → Cancelled) |
| **Categories Tab** | Full CRUD for nested categories (multi-level: Menswear → T-Shirt → Drop Shoulder). Image upload to Supabase. Parent category dropdown with indented tree view |
| **Products Tab** | Full CRUD with image upload, variants (size/color/SKU/stock), category assignment, featured toggle |

## 🏗️ Backend (Spring Boot + PostgreSQL)

| Feature | Description |
|---------|-------------|
| **REST API** | Full CRUD for products, categories, orders, users, cart, addresses, reviews |
| **JWT Auth** | Access token (15 min) + refresh token (7 days), role-based security (CUSTOMER / ADMIN) |
| **Nested Categories** | Recursive parent-child tree, products query includes all descendants |
| **Order Management** | Place order from cart, link shipping address, stock decrement, status updates |
| **Image Storage** | Supabase Storage integration for product and category images |

## 🌍 Localization (Bangladesh)

- Currency: **৳ BDT** (not USD)
- Shipping: **Free over ৳2,000**, otherwise **৳120**
- No sales tax
- Address form: No "State" field, default country = Bangladesh

## 🚀 Infrastructure

| Component | Platform |
|-----------|----------|
| Frontend | **Vercel** (Vite + React) |
| Backend | **Railway** (Spring Boot, Gradle) |
| Database | **Supabase PostgreSQL** |
| Image Storage | **Supabase Storage** |
| Source Control | **GitHub** (AladinSojon/coreman) |

## 📦 Category Tree (Seeded)

```
Menswear
├ T-Shirt → Drop Shoulder T-Shirt
├ Shirts · Hoodies & Sweatshirts · Pants & Chinos
├ Jeans · Jackets & Coats · Sweaters
└ Polo Shirts · Shorts

Womenswear
├ Dresses · Tops & Blouses · T-Shirts
├ Pants & Trousers · Women's Jeans
├ Women's Jackets & Coats · Skirts
└ Knitwear
```



# Product Management & Inventory Redesign Plan

## Current State

- **Add Product**: A basic dialog (`ProductFormDialog.tsx`) with name, brand, category, prices, HSN, description, and manual variant rows. No image upload, no color/size chips, no auto-SKU, no stock assignment.
- **Product Details**: A simple read-only dialog (`ProductDetailDialog.tsx`) showing image, prices, description, and a variants table. No tabs, no editing, no inventory view.
- **Inventory**: Works well with collapsible categories, availability toggles, stock editing, and realtime sync. Missing: filters by stock status, variant-level stock, desktop table view.
- **Catalogue page**: Grid of product cards with search/filter. Uses dialogs for both add and detail views.

## Architecture Decision

Instead of dialogs, the **Add Product** and **Product Detail** flows will become full pages for better mobile UX and progressive disclosure. The Inventory page gets enhanced filters and a desktop table view.

---

## Part 1: Add Product Page (`/catalogue/add`, `/catalogue/edit/:id`)

New file: `src/pages/AddProduct.tsx`

**Section A — Essentials (always visible, single column)**
- Product name (text input)
- Category (chip selector: Tops, Bottoms, Dresses, Outerwear, Footwear, Accessories, Ethnic, Sets, Other)
- Brand (text input)
- Gender chips (Men, Women, Unisex, Kids)
- Image upload area (placeholder — shows slots, no actual upload without storage bucket)
- Selling Price + MRP (side by side)
- Colors (multi-select chips: Black, White, Navy, Beige, Red, Blue, Green, Grey, Brown, Pink + custom)
- Sizes (multi-select chips: XS, S, M, L, XL, XXL, Free Size + custom)
- Initial stock (number input)
- Store selector (from stores table)

**Section B — Variants (auto-generated)**
When colors + sizes are selected, auto-generate a variant matrix table:
- Columns: Variant (e.g. "Black / M"), SKU (auto-generated like `BRAND-CAT-001-BLK-M`), Barcode (optional), Price Override, Stock
- Bulk fill buttons for price and stock
- All values default to parent product values

**Section C — Advanced Details (collapsible)**
- Description, Material, Fit, Occasion, Wash care, Tags, HSN code
- All optional, collapsed by default

**Sticky footer**: "Save Product" button

**Data flow**: Inserts into `products` table, then `product_variants`, then `store_inventory` (one row per variant per selected store). Also mirrors to `cigars` table for backward compat.

**Routes**: Add `/catalogue/add` and `/catalogue/edit/:id` to App.tsx. The Catalogue page "Add Product" button navigates to `/catalogue/add` instead of opening dialog.

---

## Part 2: Product Detail Page (`/catalogue/:id`)

New file: `src/pages/ProductDetail.tsx`

**Top summary card**: Image, name, brand, category, status badge (Active/Draft/Out of Stock), total stock, price, variant count.

**Tabs**:
1. **Overview** — Key info cards, quick edit buttons
2. **Variants** — Table with inline edit for SKU, barcode, price, stock, status toggle
3. **Inventory** — Store-wise stock levels with edit capability (reuse inventory patterns)
4. **Pricing** — MRP vs selling price, discount %, variant price comparison
5. **More Details** — Description, material, tags, HSN, all editable

**Route**: `/catalogue/:id` in App.tsx. ProductCard "View" navigates here instead of opening dialog.

---

## Part 3: Inventory Page Enhancement

Modify `src/pages/operations/InventoryManagement.tsx`:

**Add filter tabs**: All Products | Low Stock | Out of Stock
**Add category and brand filter dropdowns**

**Desktop view enhancement**: Add a table view option alongside the current card/collapsible view. Table columns: Image, Name, Category, Variants, Stock, Status, Store, Actions.

**Mobile**: Keep current card-based collapsible layout (already good).

---

## Part 4: Seed 10 Mock Products

Database migration to insert 10 new products with variants into `products`, `product_variants`, `cigars`, and `store_inventory` tables:

| Product | Category | Colors | Sizes | Price | MRP |
|---|---|---|---|---|---|
| Oversized Graphic T-Shirt | Tops | Black, White, Sage | S,M,L,XL | ₹799 | ₹1,099 |
| Solid Cotton Shirt | Tops | White, Sky Blue, Navy | S,M,L,XL,XXL | ₹1,499 | ₹1,999 |
| Relaxed Fit Jeans | Bottoms | Indigo, Black, Light Wash | 28,30,32,34,36 | ₹1,899 | ₹2,499 |
| Cargo Pants | Bottoms | Olive, Khaki, Black | S,M,L,XL | ₹1,699 | ₹2,199 |
| Linen Kurta | Ethnic | White, Beige, Dusty Pink | S,M,L,XL | ₹1,999 | ₹2,699 |
| Ribbed Crop Top | Tops | Black, White, Mauve | XS,S,M,L | ₹599 | ₹899 |
| A-Line Midi Dress | Dresses | Teal, Rust, Black | XS,S,M,L,XL | ₹2,499 | ₹3,299 |
| Hoodie Jacket | Outerwear | Charcoal, Navy, Maroon | S,M,L,XL | ₹2,299 | ₹2,999 |
| Co-ord Set | Sets | Lavender, Sage, Peach | S,M,L | ₹1,799 | ₹2,399 |
| Casual Sneakers | Footwear | White, Black/White | 7,8,9,10,11 | ₹2,999 | ₹3,999 |

Mix stock states: most variants have 10-30 stock, some at 2-3 (low), some at 0 (out of stock).

---

## Files to Create/Modify

1. **Create** `src/pages/AddProduct.tsx` — Full add/edit product page
2. **Create** `src/pages/ProductDetail.tsx` — Full product detail page with tabs
3. **Modify** `src/pages/Catalogue.tsx` — Navigate to new pages instead of dialogs
4. **Modify** `src/pages/operations/InventoryManagement.tsx` — Add stock status filters and desktop table view
5. **Modify** `src/App.tsx` — Add routes for `/catalogue/add`, `/catalogue/edit/:id`, `/catalogue/:id`
6. **Database migration** — Seed 10 products with variants and inventory

Existing components (`ProductCard`, `ProductFormDialog`, `ProductDetailDialog`) will be kept for backward compatibility but the primary flows will use the new pages.




# Inventory & Order Product Details — Redesign Plan

## Problems Identified

1. **Inventory page missing search bar** — `search` state exists but no search input is rendered in the UI
2. **Inventory page missing stock filter tabs** — `stockFilter` state exists but no UI to switch between All/Low/Out filters
3. **Inventory page has no desktop table view** — only collapsible card layout for all viewports
4. **Inventory page doesn't show product images, variant counts, or brand** — only name, price, and stock badge
5. **Order Detail page uses only `cigars` table for item names** — query is `cigar:cigars(name)`, so new products added via the `products` table show as "Unknown" or with legacy cigar names instead of actual product names
6. **CreateOrder page fetches only from `cigars` table** — completely ignores the `products` table, so newly added fashion products don't appear in order creation
7. **No "Add to Inventory" option visible on inventory page** — the logic exists (`addProductToInventory`) but no UI button to trigger it is rendered

## Plan

### 1. Redesign Inventory Page (`src/pages/operations/InventoryManagement.tsx`)

**Add search bar + stock filter tabs above inventory list:**
- Search input with Search icon
- Filter pill buttons: All | Low Stock | Out of Stock (wired to existing `stockFilter` state)

**Desktop table view** (shown when `!isMobile`):
- Table columns: Image (placeholder), Product Name, Category, Brand, Stock, Min Level, Status badge, Actions (Edit, Toggle)
- Replaces the collapsible card view on desktop only

**Mobile view**: Keep existing collapsible card layout but add product image thumbnail

**Add "Add Product to Inventory" button** at top, using existing `availableProducts` + `addProductToInventory` logic via a Select dropdown

### 2. Fix Order Detail Product Names (`src/pages/OrderDetail.tsx`)

**Problem**: The query `items:order_items(id, quantity, unit_price, total_price, cigar:cigars(name))` only fetches from the legacy `cigars` table.

**Fix**: Update the select query to also join `product:products(name)` via the `product_id` column on `order_items`. Update the items display to show `item.product?.name || item.cigar?.name` — so it works for both legacy and new products.

Update the interface:
```typescript
items?: { 
  id: string; quantity: number; unit_price: number; total_price: number; 
  cigar: { name: string } | null;
  product: { name: string } | null;
}[];
```

Update the items table cell:
```typescript
<TableCell>{item.product?.name || item.cigar?.name || 'Unknown'}</TableCell>
```

### 3. Fix CreateOrder Product List (`src/pages/CreateOrder.tsx`)

**Problem**: `fetchCigars` only queries the `cigars` table. New products added through the Add Product page exist in `products` but may not have matching `cigars` entries (or the cigars entry has legacy field names like "wrapper", "origin" that don't apply to fashion).

**Fix**: Add a parallel fetch from `products` table and merge results. Map `products` fields to the `Cigar` interface shape so the rest of the cart/order logic works unchanged:
- `name` → name
- `base_price` → price  
- `category` → shape (used for display)
- `brand` → wrapper (used for filter)
- `image_urls[0]` → image_url

This approach minimizes changes — the cart, order creation, and payment flows all continue to work since they reference `cigar_id` which maps to the same UUIDs.

### Files to Modify

1. `src/pages/operations/InventoryManagement.tsx` — Add search bar, filter tabs, desktop table view, add-to-inventory button
2. `src/pages/OrderDetail.tsx` — Update query to join products table, update item name display
3. `src/pages/CreateOrder.tsx` — Fetch from products table alongside cigars, merge into unified product list

### No database changes needed
All required columns and tables already exist.


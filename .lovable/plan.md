

## Problem

1. **Inventory page is empty** — The `store_inventory` table has 0 rows. The page queries this table joined with `products`, so nothing shows up even though 15 products exist.
2. **Product MRP is null for all products** — Every product has `mrp: NULL`, which means discount displays and MRP comparisons don't work.

## Plan

### 1. Database migration: Seed store_inventory and fix MRP values

A single SQL migration that:

**a) Sets MRP on all 15 products** (typically 20-40% above base_price for fashion retail):

| Product | Base Price | MRP |
|---|---|---|
| Classic White Shirt | ₹1,899 | ₹2,499 |
| Slim Fit Chinos | ₹2,499 | ₹3,199 |
| Printed Polo T-Shirt | ₹1,299 | ₹1,699 |
| Denim Trucker Jacket | ₹4,599 | ₹5,999 |
| Linen Kurta | ₹2,199 | ₹2,799 |
| Tailored Blazer | ₹6,999 | ₹8,999 |
| Cargo Joggers | ₹999 | ₹1,299 |
| Graphic Oversized Tee | ₹699 | ₹999 |
| Oxford Button-Down | ₹2,299 | ₹2,999 |
| Bomber Jacket | ₹3,499 | ₹4,499 |
| Henley Full Sleeve | ₹899 | ₹1,199 |
| Camp Collar Shirt | ₹1,499 | ₹1,999 |
| Stretch Skinny Jeans | ₹1,999 | ₹2,599 |
| Pleated Wide Trousers | ₹3,299 | ₹4,299 |
| Embroidered Nehru Jacket | ₹4,999 | ₹6,499 |

**b) Inserts `store_inventory` rows** for all 15 products across both stores (Bandra + Indiranagar) with realistic stock quantities. Uses `cigar_id = product_id` (matching the existing pattern in `addProductToInventory`). Sets varied quantities (5-50) and appropriate min_stock_level values.

### No code changes needed
The inventory page code already correctly queries `store_inventory` joined with `products`. Once the data exists, products will appear grouped by category with availability toggles.


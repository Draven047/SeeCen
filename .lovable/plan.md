

# Feedback Implementation Plan

Five enhancements across Growth, Warnings, Inventory, and Orders.

---

## 1. Persist Growth Offers in Database

**New table**: `offers` with columns: `id`, `store_id`, `name`, `type`, `value`, `status` (active/scheduled/ended), `expires_at`, `created_by`, `created_at`, `updated_at`.

**Migration**: Create table + RLS (authenticated SELECT, creator INSERT, admin/creator UPDATE/DELETE).

**Growth.tsx changes**: Replace `useState<Offer[]>(mockOffers)` with Supabase queries. Fetch on mount, insert on create, wire store_id from `useStore()`.

---

## 2. Swipe-to-Dismiss Warning Banners + Auto-Refresh

**WarningBannerSystem.tsx changes**:
- Add 60-second `setInterval` calling `checkHealth()`, clearing on unmount.
- Add touch tracking (`onTouchStart`, `onTouchMove`, `onTouchEnd`) per banner. When horizontal swipe > 100px, animate translateX to full width then dismiss. Use inline `style` with `transform` and `transition`.

---

## 3. Real-Time Inventory Sync

**Migration**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.store_inventory;`

**InventoryManagement.tsx changes**: Subscribe to `postgres_changes` on `store_inventory` filtered by `store_id`. On INSERT/UPDATE/DELETE events, refetch inventory (or patch local state). Unsubscribe on cleanup.

---

## 4. Bulk Category Toggle in Inventory

**InventoryManagement.tsx changes**: Add a toggle button in each category header row (next to the "X/Y available" text). Clicking it sets all items in that category to available (if any are unavailable) or all to unavailable (if all are available). Uses a batch of Supabase updates via `Promise.all`.

---

## 5. Swipe Gestures on Order Cards

**KanbanOrderCard.tsx changes**: Add touch handlers for horizontal swipe detection. Swipe right (>80px) on `new_orders` column triggers Accept action. Swipe left (>80px) triggers Reject. Show colored background reveal (green for accept, red for reject) during swipe using `translateX` transform. Only active on mobile (check column has actions). Other columns: swipe right triggers their primary action.

---

## Files Summary

| File | Action |
|---|---|
| `src/pages/Growth.tsx` | Edit: DB-backed offers |
| `src/components/layout/WarningBannerSystem.tsx` | Edit: swipe dismiss + auto-refresh |
| `src/pages/operations/InventoryManagement.tsx` | Edit: realtime + bulk toggle |
| `src/components/orders/KanbanOrderCard.tsx` | Edit: swipe gestures |
| Migration | Create `offers` table + realtime on `store_inventory` |


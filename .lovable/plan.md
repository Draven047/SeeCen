

# Clozzet SellerOS Redesign — Phased Implementation Plan

This is a massive undertaking spanning navigation, layout, all major pages, new modules, and a design system overhaul. It must be broken into phases to avoid breaking the working product. Each phase is independently shippable.

---

## Current State Summary

- 14+ pages, all wrapped in `DashboardLayout` (desktop sidebar + header + mobile bottom nav)
- Routes: Dashboard, Orders, Catalogue, Inventory, Fulfillment, Shipping, Returns, Customers, Finance, Analytics, Admin, Channels, Settings, AI Coach
- Existing Kanban board in Orders (just added)
- Electric Indigo design system with light/dark mode
- Role-based access (admin, manager, sales, operations, finance, viewer)
- Multi-store with StoreSwitcher

---

## New Information Architecture

```text
BOTTOM NAV (mobile)          SIDEBAR (desktop)
─────────────────           ─────────────────
1. Orders (primary)          Orders
2. Inventory                 Inventory
3. Hub                       Hub
4. Feedback                  Feedback
5. Finance                   Finance
                             ── More ──
                             Growth
                             Channels
                             Employees
                             Admin
                             Settings
```

### Route Mapping (existing → new)

| New Section | Route | Source |
|---|---|---|
| Orders | `/orders` | Existing Orders + Kanban (default to Kanban) |
| Order Detail | `/orders/:id` | Existing OrderDetail |
| Create Order | `/orders/new` | Existing CreateOrder |
| Inventory | `/inventory` | Existing Inventory page |
| Hub | `/dashboard` (renamed) | New page replacing Dashboard |
| Feedback | `/feedback` | New page (wraps Returns + future reviews) |
| Finance | `/finance` | Existing Finance |
| Growth | `/growth` | New page (offers/campaigns) |
| Store Status | Drawer/sheet from Header | New component |
| More/Settings | `/settings` | Existing Settings + grouped links |

Pages kept but accessible from Hub/More: Catalogue, Fulfillment, Shipping, Customers, Employees, Analytics, Admin, Channels, AI Coach.

---

## Phase Breakdown (6 phases)

### Phase 1: Navigation & Layout Shell
**Goal**: Replace navigation architecture without changing page content.

**Changes**:
- **New `SellerOSLayout.tsx`** replacing `DashboardLayout` — new shell with:
  - Mobile: redesigned bottom nav (5 tabs: Orders, Inventory, Hub, Feedback, Finance) with pill-style active indicator, 56px height, thumb-friendly
  - Desktop: slim left sidebar with same IA, collapsible
  - New global header with: store name + online/offline status pill, notification bell, user avatar, hamburger for "More" on mobile
- **New `StoreStatusDrawer.tsx`**: online/offline toggle, pause orders, operating hours (UI only initially)
- **New `WarningBannerSystem.tsx`**: persistent banners for critical issues (high rejection, store offline, payout issues) — renders below header
- **Update `App.tsx`** routes: add `/feedback`, `/growth`, redirect `/dashboard` to Hub
- **New `src/pages/Hub.tsx`**: control tower page (today stats, quick links grid, business insight cards)
- **New `src/pages/Feedback.tsx`**: wraps existing Returns + placeholder for reviews tab
- **New `src/pages/Growth.tsx`**: goal-based cards UI (placeholder)

**Files to create**: `SellerOSLayout.tsx`, `SellerOSBottomNav.tsx`, `SellerOSHeader.tsx`, `SellerOSSidebar.tsx`, `StoreStatusDrawer.tsx`, `WarningBannerSystem.tsx`, `Hub.tsx`, `Feedback.tsx`, `Growth.tsx`
**Files to edit**: `App.tsx` (routes), all existing pages (swap `DashboardLayout` → `SellerOSLayout`)

### Phase 2: Orders Redesign — Live Operations Mode
**Goal**: Make Orders feel like a real-time operations workspace.

**Changes**:
- Redesign Orders page as the primary operational screen
- Default to Kanban view with fashion-seller-friendly status tabs: New → Accepted → Packing → Ready → In Transit → Delivered → Issues
- **New `IncomingOrderModal.tsx`**: full-screen slide-up sheet for new incoming orders with countdown timer, item details, prep time selector (+/- chips), Accept/Reject actions
- **Redesign `KanbanOrderCard.tsx`**: larger touch targets, cleaner card layout matching the spec (order ID, customer, amount, items, payment badge, channel badge, SLA countdown)
- Add sound alert capability for new orders (optional audio element)
- Segmented pill tabs above board for quick status filtering
- Empty state: calm, clean illustration when no active orders

**Files to create**: `IncomingOrderModal.tsx`, `OrderStatusTabs.tsx`
**Files to edit**: `Orders.tsx`, `KanbanOrderCard.tsx`, `OrderKanbanBoard.tsx`

### Phase 3: Inventory Mobile-First Redesign
**Goal**: Transform inventory from ERP table to quick availability control.

**Changes**:
- Redesign Inventory page with search bar + category tabs at top
- Collapsible category sections with large toggles for availability
- Product cards with variant-level stock controls (size/color toggles)
- "Can I sell this right now?" as the primary UX question
- Desktop keeps richer table, mobile gets card-based toggle interface

**Files to edit**: `Inventory.tsx`, `InventoryManagement.tsx`

### Phase 4: Hub, Finance & Feedback Polish
**Goal**: Flesh out the three supporting modules.

**Changes**:
- **Hub**: Today stats (sales, orders, live status), quick links grid (8-12 links), business insight summary cards with "View details" CTAs
- **Finance**: Restructure as payout center — current cycle card, estimated payout, completed payouts list, report downloads
- **Feedback**: Tabs for complaints/returns + reviews, date/status filters, card-based list

**Files to edit**: `Hub.tsx`, `Finance.tsx`, `Feedback.tsx`

### Phase 5: Growth Module & Store Status
**Goal**: Add growth tools and operational controls.

**Changes**:
- **Growth page**: Goal-based cards (increase AOV, promote collection, reward repeats), create offers flow, track active offers
- **Store Status**: Wire up online/offline toggle to a store state (could use a `store_status` column or local state), pause orders functionality, rush mode indicator
- Warning banner system wired to real data (rejection rate, sync errors, payout issues)

**Files to edit**: `Growth.tsx`, `StoreStatusDrawer.tsx`, `WarningBannerSystem.tsx`

### Phase 6: Design System Polish & Desktop Adaptation
**Goal**: Visual refinement across all screens.

**Changes**:
- Update CSS variables for softer grey background, refined card shadows
- Pill tabs component, segmented controls component
- Bottom sheet/drawer patterns for mobile actions
- Desktop multi-column layouts for Hub, Finance
- Empty states with clean illustrations
- Touch target audit (44px minimum)
- Ensure desktop sidebar and mobile bottom nav feel like same product family

**Files to edit**: `index.css`, various UI components

---

## Implementation Priority

**I recommend starting with Phase 1** (Navigation & Layout Shell) as it establishes the new IA that everything else builds on. This is the highest-impact change and sets the foundation.

Shall I proceed with Phase 1?


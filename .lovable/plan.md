

# Kanban Order Board — Implementation Plan

## Overview

Add a Kanban view toggle to the existing Orders page. The list view remains the default; switching to Kanban renders a horizontal board grouped by `fulfillment_status`. No new database tables needed — this is purely a UI feature that reads from the existing `orders` table and updates `fulfillment_status` on drag/drop.

---

## Architecture

```text
src/pages/Orders.tsx            ← Add view toggle state, conditionally render list or <OrderKanbanBoard>
src/components/orders/
  OrderKanbanBoard.tsx           ← Main board: columns, filters, drag context
  KanbanColumn.tsx               ← Single column with header + card list
  KanbanOrderCard.tsx            ← Individual order card with actions
```

---

## Technical Details

### 1. View Toggle (Orders.tsx)

- Add `viewMode` state (`'list' | 'kanban'`), default `'list'`.
- Render two toggle buttons (List / Kanban) in the header row next to existing buttons.
- When `kanban`, hide the existing table/cards and render `<OrderKanbanBoard>` instead, passing `orders`, `loading`, `fetchOrders`, filters, and navigation.

### 2. OrderKanbanBoard Component

**Kanban columns** mapped from fulfillment statuses:

| Column | `fulfillment_status` values |
|---|---|
| New Orders | `new`, `unfulfilled` |
| Accepted | `accepted` |
| Picking | `picking` |
| Packed | `packed` |
| Pickup Pending | `ready` |
| Pickup Scheduled | `pickup_scheduled`, `handover` |
| Out For Delivery | `in_transit` |
| Delivered | `delivered`, `fulfilled` |
| Issues / Returns | `declined`, `cancelled`, `failed_delivery`, `rto`, `returned`, `partial_fulfilled` |

**Drag and drop**: Use HTML5 native drag/drop (no extra library needed). `onDragStart` sets order ID + source column; `onDrop` validates the transition is allowed and calls a status update function.

**Allowed transitions map** — only adjacent forward moves allowed (backward moves blocked):
```
new → accepted → picking → packed → ready → pickup_scheduled → in_transit → delivered
```
Issues column is drop-disabled (orders move there via reject/cancel actions only).

**Status update on drop**: Call `supabase.from('orders').update({ fulfillment_status: newStatus }).eq('id', orderId)`, then refresh or optimistically update local state. Show toast on success/failure.

**Filter bar**: Compact row above the board with Channel, Payment Type, and Search input. Reuses existing filter state from parent or has its own local filters.

**Horizontal scroll**: Board container uses `overflow-x-auto` with `flex-nowrap`. Each column is `min-w-[280px] w-[280px]` on desktop. On mobile, columns scroll horizontally with snap scrolling (`scroll-snap-type: x mandatory`).

### 3. KanbanColumn Component

- Header: column title + count badge.
- Body: scrollable card list (`max-h-[calc(100vh-280px)] overflow-y-auto`).
- Drop zone: `onDragOver` + `onDrop` handlers with visual highlight.
- Lazy rendering: Only render first 20 cards per column, with "Show more" button.

### 4. KanbanOrderCard Component

- Displays: order number, channel badge (colored per channel), customer name, total, items count, payment badge (green for prepaid, orange for COD), SLA countdown.
- **SLA near-breach**: Red left border (`border-l-4 border-destructive`) when `sla.urgent`.
- **Channel colors**: Use existing `CHANNEL_CONFIG` color classes.
- **Draggable**: `draggable` attribute on desktop; disabled on mobile (touch uses buttons instead).
- **Action buttons**: Contextual per column (Accept, Start Picking, Move to Packing, etc.). Each button updates `fulfillment_status` via Supabase and refreshes.
- Click on card navigates to `/orders/${id}`.

### 5. Mobile Responsive

- Columns scroll horizontally with snap.
- Cards are full-width within column.
- Drag disabled on touch devices — action buttons are the primary interaction.
- Min touch target 44px on all buttons.

### 6. Performance

- Query limited to 500 orders (already in place).
- Per-column card limit of 20 with "Load more".
- No virtualization library needed at this scale.

---

## Files to Create/Edit

| File | Action |
|---|---|
| `src/pages/Orders.tsx` | Edit: add view toggle, conditionally render Kanban |
| `src/components/orders/OrderKanbanBoard.tsx` | Create: main board with columns + filters |
| `src/components/orders/KanbanColumn.tsx` | Create: single column component |
| `src/components/orders/KanbanOrderCard.tsx` | Create: order card with actions |

No database changes required — uses existing `orders.fulfillment_status` field.


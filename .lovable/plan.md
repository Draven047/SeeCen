

# Orders Page — OMS Queue Redesign

## What Changes

Replace the Kanban board with a split-panel OMS layout: status tabs on top, order queue list on the left, order detail panel on the right.

## Architecture

**Single file rewrite**: `src/pages/Orders.tsx` (~550 lines)

The existing `OrderDetail.tsx` full page remains for deep-dive/finance actions. The new inline detail panel shows a summary with primary fulfillment actions, and a "Full Details" link navigates to the existing detail page.

Kanban components (`OrderKanbanBoard.tsx`, `KanbanColumn.tsx`, `KanbanOrderCard.tsx`) are no longer imported but kept in codebase for now.

## Layout Structure

```text
┌──────────────────────────────────────────────────┐
│  Header: Orders (count) | Search | Filters | +New│
├──────────────────────────────────────────────────┤
│  Status Tabs (scrollable): New(5) Accepted(3)... │
├─────────────────────────┬────────────────────────┤
│  Order Queue List       │  Order Detail Panel    │
│  (sorted by urgency)    │  (selected order)      │
│                         │                        │
│  compact rows with:     │  customer, items,      │
│  - order #, customer    │  timeline, amounts,    │
│  - channel + payment    │  fulfillment actions   │
│  - amount, SLA, items   │                        │
│  - next action button   │  "Open Full Details →" │
│                         │                        │
│  [empty: "No orders"]   │  [empty: "Select an    │
│                         │   order to view"]      │
└─────────────────────────┴────────────────────────┘
```

**Mobile**: Full-width queue list. Clicking an order opens a Sheet (bottom drawer) with the detail panel content.

## Status Tabs

Reuse existing `KANBAN_COLUMNS` status groupings:

| Tab | Statuses | 
|-----|----------|
| New | new, unfulfilled |
| Accepted | accepted |
| Picking | picking |
| Packed | packed |
| Ready | ready |
| Scheduled | pickup_scheduled, handover |
| In Transit | in_transit |
| Delivered | delivered, fulfilled |
| Issues | declined, cancelled, failed_delivery, rto, returned |

Each tab shows a count badge. Horizontally scrollable on mobile.

## Queue List Row Design

Compact row (~64px height) showing:
- **Left**: Order # (bold), customer name, channel badge (colored pill), item count
- **Center**: Amount (bold), payment badge (COD/Prepaid), time ago
- **Right**: SLA indicator (color-coded), primary action button (small)
- Urgent orders get a left border accent (destructive color)
- Selected order gets highlighted background

## Sort Options

Dropdown above the queue: Urgency (default) | Newest | Oldest | Highest Amount

Urgency sort: SLA-breached first → critical → warning → safe, then by created_at desc.

## Detail Panel (Desktop: right side, Mobile: Sheet)

Content (fetched on selection from the already-loaded order list + a detail fetch for items):
- **Header**: Order #, status badge, channel, payment type, SLA
- **Customer**: Name, phone, address
- **Items**: Fetched via separate query to `order_items` with product/cigar joins
- **Timeline**: Reuse existing `TIMELINE_STEPS` stepper
- **Summary**: Subtotal, tax, total
- **Actions**: Same logic as `OrderDetail.getNextActions()` — Accept, Start Picking, etc. Decline/Cancel open confirmation dialogs inline.
- **Footer link**: "Open Full Details →" navigates to `/orders/{id}`

## Reused Logic

- `OrderRow` interface — kept as-is
- `fetchOrders` query — kept as-is
- Filter system (channel, payment, fulfillment type/status) — kept, still in popover
- CSV import dialog — kept
- `CHANNEL_CONFIG`, `FULFILLMENT_CONFIG`, `getSlaStatus` — all reused
- Status transition via `supabase.from('orders').update(...)` — copied from OrderKanbanBoard
- All existing filter pills, active filter count, clear logic — kept

## Removed

- `OrderKanbanBoard` import and rendering
- `viewMode` toggle (list vs kanban) — no longer needed, single OMS view
- Kanban-specific components are no longer used (files kept for safety)

## Technical Details

- Detail panel items fetched separately: `supabase.from('order_items').select('*, cigar:cigars(name), product:products(name)').eq('order_id', selectedId)`
- Mobile detection via existing `useIsMobile()` hook
- Sheet component from `@/components/ui/sheet` for mobile detail drawer
- Decline/Cancel dialogs rendered inline in the detail panel using Dialog components
- Sort function computes urgency score from `sla_deadline` for ordering

## Files Modified

1. **`src/pages/Orders.tsx`** — Complete rewrite with OMS layout

No other files need changes. No database changes needed.




# Simplify Orders Page — Plan

## Changes

### 1. Default to Kanban view
Change `viewMode` initial state from `'list'` to `'kanban'` in `Orders.tsx`.

### 2. Collapse filters into a dropdown/popover
Remove the always-visible Channel Chips row, Fulfillment Status Chips row, and the Filters card. Replace with a single "Filters" button that opens a `Popover` containing all filter dropdowns (Channel, Status, Payment, Fulfillment Type, Fulfillment Status) plus search. Show an active filter count badge on the button when filters are applied.

### 3. Clean up the header
Simplify the header row:
- Left: "Orders" title with count subtitle (remove SLA warning from subtitle — it's visible in Kanban columns)
- Right: compact button group — Filter popover trigger, View toggle (List/Kanban), Refresh icon, New Order button, Import (collapsed into a "more" dropdown or kept as icon-only)

### 4. Remove duplicate filters from OrderKanbanBoard
Since the parent page now handles all filtering, remove the inline filter bar from `OrderKanbanBoard.tsx` to avoid duplication. The board just receives pre-filtered orders.

### Files to edit
| File | Changes |
|---|---|
| `src/pages/Orders.tsx` | Default kanban, replace filter sections with popover, clean header |
| `src/components/orders/OrderKanbanBoard.tsx` | Remove inline filter bar |




# Hub Page — Premium Redesign Plan

## Current Problems
- 4 stat cards + 12 quick links + 4 insight cards + store health = too many equal-weight boxes
- 3-column layout on desktop crams quick links, orders, and insights side-by-side
- Quick links (12 items) dominate a full column — too prominent
- No clear focal point; everything competes equally
- Store health card feels disconnected

## New Structure

### Desktop Layout

```text
┌─────────────────────────────────────────────────────┐
│  Good morning · Store name · Today, March 27        │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌──────┐ ┌──────┐ ┌────┐ │
│  │  ₹24,500             │  │ 12   │ │ 3    │ │ ₹2K│ │
│  │  Today's Sales       │  │Orders│ │ Live │ │ AOV│ │
│  │  (hero, primary bg)  │  │      │ │      │ │    │ │
│  └─────────────────────┘  └──────┘ └──────┘ └────┘ │
├─────────────────────────────────────────────────────┤
│  Quick Actions:  [Orders] [Inventory] [Finance]     │
│                  [Feedback] [More →]                 │
├──────────────────────────┬──────────────────────────┤
│  Recent Orders           │  Insights                │
│  (wider, 7-col)          │  (5-col, lighter cards)  │
│  - clean list rows       │  - Sales Overview        │
│  - status pill           │  - Order Funnel          │
│  - amount + time         │  - Inventory Health      │
│                          │  ──────────────           │
│  "View all orders →"     │  Store Health metrics     │
└──────────────────────────┴──────────────────────────┘
```

### Section-by-Section Design

**1. Hero Stats Row**
- Primary stat (Sales Today) gets a larger card with subtle primary gradient background, bigger typography (text-3xl)
- 3 supporting stats (Orders, Live, AOV) are smaller, borderless, minimal — just value + label
- Single unified row, not 4 identical boxes
- Greeting + store name + date above

**2. Quick Actions (replaces 12-item grid)**
- Horizontal row of 4 primary actions: Orders, Inventory, Finance, Feedback
- Compact pill-style buttons with icon + label, not full cards
- 5th item: "More" opens remaining links in a popover/dropdown
- Much lower visual weight than current grid

**3. Recent Orders (left, 7/12 columns)**
- Clean borderless list rows with subtle hover
- Each row: order number (mono), status pill, customer, amount, time
- No icon-in-circle per row — just clean text hierarchy
- "View all" link at bottom
- More spacious padding

**4. Insights + Store Health (right, 5/12 columns)**
- Only 3 insight cards (remove Customer Insights — it's lower priority)
- Cards are borderless with a subtle left accent line, no outer border
- Store Health stays but with softer presentation — no separate bordered card, just metric rows under insights

### Mobile Layout
- Greeting + date
- Hero stat (Sales) as single prominent card, 3 stats in a row below
- Quick actions as horizontal scroll pills
- Recent orders as card list
- Insights stacked below

## Files Modified

1. **`src/pages/Hub.tsx`** — Full rewrite with new hierarchy, hero stats, compact quick actions, cleaner orders/insights layout

No new files, no database changes.


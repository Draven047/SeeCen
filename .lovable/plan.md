

# Growth Page — Complete Rebuild Plan

## Current State Audit

**Working:**
- Create Offer dialog (writes to `offers` table)
- Fetch and display offers list
- Store-scoped filtering

**Broken / Non-functional:**
- 6 "Growth Goal" cards — buttons that do nothing (no onClick handler)
- ChevronRight on offer cards suggests navigation but does nothing
- No way to edit, pause, or delete offers
- No expiry date field when creating offers
- No performance data shown

**Missing entirely:**
- Growth overview stats
- Offer management (edit/pause/stop)
- Campaign suggestions that lead to actions
- Product promotion section
- Performance tracking
- Customer growth section

---

## Plan

### Single file rewrite: `src/pages/Growth.tsx`

Reorganize into a tabbed layout with 3 tabs: **Overview**, **Offers**, **Grow**

### Tab 1: Overview (default)
4 summary stat cards at top:
- Active Offers (count from `offers` where status='active')
- Total Orders (from `orders` count)
- Revenue from Offers (placeholder — show total revenue for now)
- Products in Catalogue (count from `products`)

Below stats: **Active Offers** list (top 3 with "View All" linking to Offers tab) + **Quick Actions** grid (Create Offer, View Products, Customer List — each navigates to real pages or opens the create dialog)

### Tab 2: Offers
Full offer management:
- Create Offer button (enhanced dialog with expiry date field)
- Filter pills: All / Active / Scheduled / Expired
- Offer cards with actions: Pause/Resume, Edit (opens dialog pre-filled), Delete
- Empty state: "No offers yet. Create your first offer to boost sales."
- Status toggle: clicking pause sets status='paused', resume sets 'active'

### Tab 3: Grow (Campaigns & Suggestions)
Actionable suggestion cards that open the Create Offer dialog pre-filled:
- "First-time buyer discount" → pre-fills name + type
- "Boost slow movers" → pre-fills with discount type
- "Reward repeat customers" → pre-fills with freebie/cashback
- "Weekend flash sale" → pre-fills with discount
- "Category sale" → pre-fills
- "Festive promotion" → pre-fills

Each card has a single CTA "Create This Offer" that opens dialog with pre-populated values.

Below: **Product Spotlight** section showing products from DB grouped as:
- Bestsellers (top 5 by price, as proxy without order data)
- Budget-friendly (lowest price products)
Each product card shows name, price, category, and a "Promote" button that pre-fills an offer for that product.

### Enhanced Create/Edit Offer Dialog
Add fields:
- Offer Name (existing)
- Type (existing)  
- Value (existing)
- Expiry Date (new — optional date input)
- Support edit mode (pre-fill when editing)

### Data Flow
- All reads/writes use the existing `offers` table
- Product data from `products` table
- Order counts from `orders` table
- Offer status updates via `supabase.from('offers').update({ status }).eq('id', id)`
- Offer deletion via `supabase.from('offers').delete().eq('id', id)` (if RLS allows — check: admin or creator can delete ✓)

### Technical Details
- Reuse existing `supabase` client, `useStore`, `useAuth`
- Reuse existing UI components: Tabs, Badge, Button, Dialog, Input, Select, Card
- Use `date-fns` for expiry formatting (already installed)
- No new tables or migrations needed
- All actions wire to real DB operations
- Mobile-friendly: single column layout, min-h touch targets




# Redesign: Incoming Order Alert Experience

## Overview

Replace the current basic `MockOrderPopup` dialog with a premium, Zomato-inspired incoming order alert system. The new component will be a full-screen bottom sheet on mobile and a focused center modal on desktop, with sound alerts, countdown urgency, packing time selection, and a rejection reason flow.

---

## Architecture

**New file**: `src/components/orders/IncomingOrderAlert.tsx` — the full redesigned component, replacing `MockOrderPopup`.

**Edit**: `src/components/layout/SellerOSLayout.tsx` — swap import from `MockOrderPopup` to `IncomingOrderAlert`.

**Delete or deprecate**: `src/components/orders/MockOrderPopup.tsx` — no longer used.

---

## Component Structure (IncomingOrderAlert.tsx)

### Data & State
- Reuse existing mock order generation logic (customers, items, channels, payment types).
- Extend mock data to include: variant details (size/color), delivery type (Delivery/Pickup/Self-ship), store name, order timestamp, quantities per item.
- States: `order`, `countdown`, `packingTime`, `isMuted`, `showRejectFlow`, `rejectReason`, `isAccepting`, `showDetails` (item expansion), `isExpired`.

### Sound
- Play an alert sound on new order arrival using `Audio` API (a short notification beep — use a web audio tone generator or a small embedded base64 audio clip).
- Loop sound every few seconds until dismissed or muted.
- Mute toggle persists per session.

### Layout (top to bottom)

**1. Overlay**: Dark semi-transparent backdrop with slight blur.

**2. Alert Container**: 
- Mobile: slides up from bottom, nearly full-screen (max-h-[92vh]), rounded top corners.
- Desktop: centered modal, max-w-md, fully rounded.

**3. Header Bar** (sticky top):
- "1 new order" title, bold.
- Channel source badge (small pill: "Clozzet", "Myntra", etc.).
- Countdown timer displayed prominently (mm:ss).
- Sound mute toggle icon button.
- No close X as primary — tapping backdrop does nothing (forced action).

**4. Order Summary Block**:
- Order ID (bold, mono) + copy icon.
- Customer name + "1st order" or "Returning" indicator.
- Store name / location (subtle).
- Order timestamp.
- Row of badges: Payment type (Prepaid/COD), Delivery type, Items count.

**5. Item Details Section** (collapsible):
- "Details — N items" header with expand/collapse chevron.
- Each item: product name, variant (size/color), quantity, optional notes.
- Scrollable if >3 items.

**6. Total Bill Row**:
- "Total bill" label + bold ₹ amount on right with expand chevron for breakdown.

**7. Packing Time Section**:
- Label: "Packing time".
- Stepper: `[-]` current value `[+]` (increment by 5 min, range 5-60).
- Preset chips below: 10 min, 15 min, 20 min, 30 min.
- Large touch targets (48px height).

**8. Action Area** (sticky bottom on mobile):
- Primary CTA: "Accept (04:32)" — full-width, large (56px height), dark/brand color.
  - Countdown inside button text.
  - Color shifts: normal → amber when <60s → red when <30s.
  - Progress bar below button showing time remaining.
- Secondary: "Reject" link/button below Accept.
- Optional row: Print order | View full details — small text links.

### Countdown & Urgency
- 120-second countdown (reuse existing `COUNTDOWN_SECS`).
- Visual phases:
  - >60s: calm (default button color).
  - 30-60s: amber tint on button + timer.
  - <30s: red/pulsing button, urgent animation.
- On expiry: show "Order timed out" state briefly, then dismiss. Toast notification.

### Rejection Flow
- On "Reject" tap: slide in a lightweight reason picker (replaces action area).
- Reasons: "Out of stock", "Store busy", "Unable to fulfill", "Delivery issue", "Other".
- Single tap on reason → confirm reject → dismiss + toast.
- Back button to return to main view.

### Edge Cases
- **Multiple orders**: Queue system — if new order arrives while popup open, queue it and show next after current is dismissed.
- **Long product names**: Truncate with ellipsis.
- **Duplicate accept clicks**: Disable button after first click, show spinner.
- **Network failure**: Try/catch on accept, show error toast, re-enable button.
- **Tab visibility**: Pause countdown when tab hidden, resume on focus (using `visibilitychange` event).

---

## Visual Design Tokens
- Popup surface: `bg-white` / `bg-card`.
- Rounded corners: `rounded-2xl` (top only on mobile sheet).
- Dividers: `border-b border-border` (dashed for order summary separator).
- Typography: Order ID `text-lg font-bold font-mono`, amount `text-2xl font-bold`.
- Touch targets: all interactive elements min `h-12` (48px).
- Accept button: `bg-blue-600 hover:bg-blue-700` normal → `bg-amber-500` warning → `bg-red-600` urgent.

---

## Files Summary

| File | Action |
|---|---|
| `src/components/orders/IncomingOrderAlert.tsx` | Create (full new component) |
| `src/components/layout/SellerOSLayout.tsx` | Edit: swap MockOrderPopup → IncomingOrderAlert |
| `src/components/orders/MockOrderPopup.tsx` | Keep as-is (replaced by new import) |


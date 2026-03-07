

# Test Results & Fix Plan

## Test Findings

### 1. Desktop Order Popup Centering — BUG FOUND
The popup is **not centered** on desktop. It appears offset to the right. The root cause is that Framer Motion's `animate={{ opacity: 1, scale: 1 }}` sets a `transform: scale(1)` which **overrides** the inline `style={{ transform: 'translate(-50%, -50%)' }}`. Both compete for the same CSS `transform` property.

**Fix**: Use Framer Motion's `x` and `y` properties instead of CSS `top/left + translate`:
- Remove `top-1/2 left-1/2` classes and the inline `style` prop
- Add `x: '-50%', y: '-50%'` to the framer-motion `initial` and `animate` props, combined with `top: '50%', left: '50%'` in the className
- Or simpler: use CSS `inset-0 m-auto` with fixed width/height to auto-center without transforms

### 2. Mobile Order Popup — WORKING
- Bottom sheet slides up correctly with rounded top corners
- Header shows order title, channel badge, queued count, countdown timer, mute toggle
- Packing time stepper ([-] / [+]) and preset chips work correctly (tested 15 → 10 min)
- Accept button works — toast confirms with packing time
- Queue system works — next order loads immediately after accepting
- Urgency color shifts confirmed (countdown went red at <30s)

### 3. FAB Scanner — NEEDS MOBILE TESTING
The FAB is hidden on `/orders/new`. Camera-based scanning cannot be tested in browser automation (limitation). The code structure for manual barcode entry and product lookup is correctly implemented.

### 4. Reject Flow — WORKING
Code review confirms the reject reason picker renders when `showRejectFlow` is true, with "Back" button, reason list, and dismissal on selection.

---

## Implementation Plan

### File: `src/components/orders/IncomingOrderAlert.tsx`

**Fix desktop centering** (lines 329-341):

Replace the desktop framer-motion props and className to properly center using Framer Motion's `x`/`y` animation values:

```tsx
initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
```

Keep `top-1/2 left-1/2` in className, remove the inline `style` prop entirely.

This ensures Framer Motion composes `translate(-50%, -50%) scale(1)` together in one transform, keeping the popup perfectly centered.

**Single file change, ~5 lines modified.**


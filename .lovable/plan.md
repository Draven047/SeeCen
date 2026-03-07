

# Mock Order Popup Toggle in Settings

## What to build

Add a "Developer / Testing" section to the Settings page with a toggle switch for "Mock Order Popup." When enabled, a mock incoming order popup appears every 60 seconds across the app. The toggle state is persisted in `localStorage`.

## Implementation

### 1. Settings page (`src/pages/Settings.tsx`)
- Add a card section titled "Testing & Development"
- Include a `Switch` toggle labeled "Mock Order Popup" with description "Receive a simulated new order popup every 60 seconds"
- Read/write state from `localStorage` key `clozzet_mock_order_enabled`

### 2. Mock Order Popup component (`src/components/orders/MockOrderPopup.tsx`)
- New component rendered in `SellerOSLayout.tsx`
- Reads `localStorage` for the toggle state, listens to `storage` events for cross-tab sync
- When enabled, runs a 60s `setInterval` that triggers a full-screen slide-up dialog/drawer showing a mock incoming order with:
  - Random order ID, customer name, items, amount, channel, payment type
  - Countdown timer (e.g. "Accept within 2:00")
  - Prep time selector (+/- chips: 15m, 30m, 45m, 1h)
  - Accept / Reject buttons (just dismiss the popup with a toast)
- When disabled, clears interval and hides

### 3. Wire into layout (`src/components/layout/SellerOSLayout.tsx`)
- Import and render `<MockOrderPopup />` at the layout level so it works on any page

### Files
| File | Action |
|---|---|
| `src/pages/Settings.tsx` | Edit: add toggle switch |
| `src/components/orders/MockOrderPopup.tsx` | Create: mock order popup with interval logic |
| `src/components/layout/SellerOSLayout.tsx` | Edit: render MockOrderPopup |


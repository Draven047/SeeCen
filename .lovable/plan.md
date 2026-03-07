# Fix: Wire NewOrderFAB into Layout

## Findings

1. **NewOrderFAB** — NOT RENDERED. The component exists at `src/components/layout/NewOrderFAB.tsx` but is never imported or used in `SellerOSLayout.tsx`. This is why the +Order FAB and Scan button are invisible.
2. **Barcode scanner** — Cannot test until the FAB is wired in. Camera-based scanning also requires a physical device (browser automation limitation). Manual barcode entry logic is implemented in code.

## Plan

### File: `src/components/layout/SellerOSLayout.tsx`

Add `NewOrderFAB` import and render it inside `SellerOSContent`, after the `IncomingOrderAlert`:

```tsx
import { NewOrderFAB } from './NewOrderFAB';
// ...
<IncomingOrderAlert />
<NewOrderFAB />
```

Single line import + single line JSX. No other changes needed.
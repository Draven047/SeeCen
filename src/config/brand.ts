// White-label configuration. Fork the repo, change these values, and the
// shell (sidebar, header, dashboard, currency formatting) follows.

export const brand = {
  name: 'SeeCen',
  tagline: 'Seller OS',
  description: 'Open-source seller command center',
  currency: 'INR',
  locale: 'en-IN',
};

export function formatCurrency(value: number, options: { decimals?: number } = {}) {
  return new Intl.NumberFormat(brand.locale, {
    style: 'currency',
    currency: brand.currency,
    maximumFractionDigits: options.decimals ?? 0,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(brand.locale).format(value);
}

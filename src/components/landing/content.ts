export const githubUrl = "https://github.com/Draven047/SeeCen";
export type ScreenName =
  "hub" | "orders" | "inventory" | "fulfillment" | "analytics" | "finance";
const descriptions: Record<ScreenName, string> = {
  hub: "Updated SeeCen Store overview with order value, open orders, sales activity, and work needing attention",
  orders:
    "SeeCen Orders with search, status filters, urgency, and next-step actions",
  inventory:
    "SeeCen Inventory showing store stock levels and replenishment controls",
  fulfillment:
    "SeeCen Fulfillment board showing picking, packing, and dispatch stages",
  analytics:
    "SeeCen Analytics with sales trends, channel mix, and store comparison",
  finance: "SeeCen Finance with sales, settlements, and COD reconciliation",
};
export const assets = Object.fromEntries(
  Object.entries(descriptions).map(([name, alt]) => [
    name,
    {
      desktop: `/landing/v2/${name}-desktop.png`,
      mobile: `/landing/v2/${name}-mobile.png`,
      alt,
    },
  ]),
) as Record<ScreenName, { desktop: string; mobile: string; alt: string }>;
type Chapter = {
  screen: ScreenName;
  label: string;
  title: string;
  body: string;
  path: string;
};
export const workflow: Chapter[] = [
  {
    screen: "orders",
    label: "Orders",
    title: "Every order. A clear next move.",
    body: "Find an order, see its urgency, and take the next step. A focused queue for busy counters and busy teams.",
    path: "/demo/orders",
  },
  {
    screen: "inventory",
    label: "Inventory",
    title: "Know what is on your shelf.",
    body: "Check stock by store, spot low quantities, and request replenishment before the next sale catches you out.",
    path: "/demo/inventory",
  },
  {
    screen: "fulfillment",
    label: "Fulfillment",
    title: "From picked to packed to gone.",
    body: "Bring picking, packing, and dispatch into one board. Keep the handoff clear, even when the queue gets busy.",
    path: "/demo/fulfillment",
  },
];
export const insights: Chapter[] = [
  {
    screen: "hub",
    label: "Overview",
    title: "Start with what needs you.",
    body: "Open orders, overdue work, and stock alerts in one overview. See the priorities without opening every page.",
    path: "/demo/dashboard",
  },
  {
    screen: "analytics",
    label: "Analytics",
    title: "See the patterns behind the day.",
    body: "Explore sales over time, compare stores, and understand your channel mix. Filter the view to the period that matters.",
    path: "/demo/analytics",
  },
  {
    screen: "finance",
    label: "Finance",
    title: "Follow the money through.",
    body: "Review settlements, track cash on delivery, and keep invoices close to the orders they belong to.",
    path: "/demo/finance",
  },
];
export const productGroups: {
  id: string;
  label: string;
  title: string;
  points: string[];
  screen: ScreenName;
  path: string;
  cta: string;
}[] = [
  {
    id: "sell",
    label: "Sell",
    title: "Ready for the next customer.",
    points: [
      "Order search and a touch-friendly POS mode",
      "A shared product catalogue and customer history",
      "Clear status changes and bulk actions",
    ],
    screen: "orders",
    path: "/demo/orders",
    cta: "Explore orders",
  },
  {
    id: "fulfill",
    label: "Fulfill",
    title: "Keep the promises you make.",
    points: [
      "Store-level inventory and stock requests",
      "Picking, packing, and dispatch queues",
      "Shipping, failed deliveries, and returns workflows",
    ],
    screen: "fulfillment",
    path: "/demo/fulfillment",
    cta: "Explore fulfillment",
  },
  {
    id: "understand",
    label: "Understand",
    title: "A clearer view of your business.",
    points: [
      "Period and store-level sales reporting",
      "Channel mix and operational performance",
      "Finance tools and simulated demo AI guidance",
    ],
    screen: "analytics",
    path: "/demo/analytics",
    cta: "Explore analytics",
  },
  {
    id: "manage",
    label: "Manage",
    title: "Keep your stores in sync.",
    points: [
      "Store-specific operational overviews",
      "Roles, team access, and approval workflows",
      "Local backups or your own shared Supabase backend",
    ],
    screen: "hub",
    path: "/demo/admin",
    cta: "Explore stores",
  },
];

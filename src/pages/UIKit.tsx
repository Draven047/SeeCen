import { useState } from 'react';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { Button } from '@/components/ui/button';
import { Input, SearchInput } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusChip } from '@/components/ui/status-chip';
import { StatCard } from '@/components/ui/stat-card';
import { WorkQueueCard } from '@/components/ui/work-queue-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { IndianRupee, Package, Users, ShoppingCart, TrendingUp, Inbox, Sun, Moon } from 'lucide-react';

export default function UIKit() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 max-w-5xl pb-16">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display">UI Kit — Design System</h1>
            <p className="text-muted-foreground mt-1">Clozzet SellerOS component library and token reference</p>
          </div>
          <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-2">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {darkMode ? 'Light' : 'Dark'}
          </Button>
        </div>

        {/* ── SECTION: Typography ── */}
        <Section title="Typography">
          <div className="space-y-3">
            <p className="text-display">Display — 30px / Bold</p>
            <p className="text-heading">Heading — 20px / Semibold</p>
            <p className="text-subheading">Subheading — 16px / Semibold</p>
            <p className="text-body">Body — 14px / Regular — The quick brown fox jumps over the lazy dog.</p>
            <p className="text-body-medium">Body Medium — 14px / Medium</p>
            <p className="text-caption text-muted-foreground">Caption — 12px / Regular — timestamps, labels</p>
            <p className="text-mono font-mono">Mono — 13px / Medium — ₹12,450.00 · #ORD-2024-0042</p>
          </div>
        </Section>

        {/* ── SECTION: Colors ── */}
        <Section title="Color Palette">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            <Swatch label="Primary" className="bg-primary" />
            <Swatch label="Secondary" className="bg-secondary" />
            <Swatch label="Accent" className="bg-accent" />
            <Swatch label="Muted" className="bg-muted" />
            <Swatch label="Success" className="bg-success" />
            <Swatch label="Warning" className="bg-warning" />
            <Swatch label="Destructive" className="bg-destructive" />
            <Swatch label="Info" className="bg-info" />
            <Swatch label="Background" className="bg-background border" />
            <Swatch label="Card" className="bg-card border" />
            <Swatch label="Border" className="bg-border" />
            <Swatch label="Ring" className="bg-ring" />
          </div>
        </Section>

        {/* ── SECTION: Spacing & Radii ── */}
        <Section title="Spacing & Radii">
          <div className="flex items-end gap-2">
            {[1, 2, 3, 4, 6, 8, 10, 12].map(n => (
              <div key={n} className="flex flex-col items-center gap-1">
                <div className="bg-primary/20 border border-primary/40" style={{ width: n * 4, height: n * 4 }} />
                <span className="text-caption text-muted-foreground">{n * 4}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="h-12 w-20 bg-muted border rounded-sm flex items-center justify-center text-caption">sm</div>
            <div className="h-12 w-20 bg-muted border rounded-md flex items-center justify-center text-caption">md</div>
            <div className="h-12 w-20 bg-muted border rounded-lg flex items-center justify-center text-caption">lg</div>
            <div className="h-12 w-20 bg-muted border rounded-full flex items-center justify-center text-caption">full</div>
          </div>
        </Section>

        {/* ── SECTION: Shadows ── */}
        <Section title="Shadows">
          <div className="flex items-center gap-6">
            <div className="h-20 w-28 rounded-lg bg-card shadow-sm flex items-center justify-center text-caption">shadow-sm</div>
            <div className="h-20 w-28 rounded-lg bg-card shadow-md flex items-center justify-center text-caption">shadow-md</div>
            <div className="h-20 w-28 rounded-lg bg-card shadow-lg flex items-center justify-center text-caption">shadow-lg</div>
          </div>
        </Section>

        {/* ── SECTION: Buttons ── */}
        <Section title="Buttons">
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="success">Success</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon"><Package className="h-4 w-4" /></Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        {/* ── SECTION: Inputs ── */}
        <Section title="Inputs & Form Controls">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div className="space-y-1.5">
              <Label>Default Input</Label>
              <Input placeholder="Enter value…" />
            </div>
            <div className="space-y-1.5">
              <Label>Search Input</Label>
              <SearchInput placeholder="Search products…" />
            </div>
            <div className="space-y-1.5">
              <Label>Select</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="opt1">Option 1</SelectItem>
                  <SelectItem value="opt2">Option 2</SelectItem>
                  <SelectItem value="opt3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Disabled Input</Label>
              <Input placeholder="Disabled" disabled />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="check1" />
                <Label htmlFor="check1">Checkbox</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="switch1" />
                <Label htmlFor="switch1">Switch</Label>
              </div>
            </div>
          </div>
        </Section>

        {/* ── SECTION: Badges ── */}
        <Section title="Badges">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="info">Info</Badge>
          </div>
        </Section>

        {/* ── SECTION: Status Chips ── */}
        <Section title="Status Chips (Order Lifecycle)">
          <div className="flex flex-wrap gap-2">
            <StatusChip status="new" />
            <StatusChip status="created" />
            <StatusChip status="pending" />
            <StatusChip status="processing" />
            <StatusChip status="paid" />
            <StatusChip status="approved" />
            <StatusChip status="shipped" />
            <StatusChip status="delivered" />
            <StatusChip status="fulfilled" />
            <StatusChip status="cancelled" />
            <StatusChip status="rejected" />
            <StatusChip status="rto" />
          </div>
        </Section>

        {/* ── SECTION: Stat Cards ── */}
        <Section title="Stat Cards">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Revenue" value="₹4,52,300" change={12.5} changeLabel="vs last month" icon={<IndianRupee className="h-4 w-4" />} />
            <StatCard title="Orders" value="156" change={-3.2} changeLabel="vs last week" icon={<ShoppingCart className="h-4 w-4" />} />
            <StatCard title="Customers" value="1,204" change={0} icon={<Users className="h-4 w-4" />} />
            <StatCard title="Conversion" value="3.8%" change={8} variant="primary" icon={<TrendingUp className="h-4 w-4" />} />
          </div>
        </Section>

        {/* ── SECTION: Cards ── */}
        <Section title="Cards">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-heading">Card Title</CardTitle>
                <CardDescription>A brief description of this card's content.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Card body content goes here. This is a standard card with header and content sections.</p>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-heading">Highlighted Card</CardTitle>
                <CardDescription>With primary accent border.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Used for important or featured content blocks.</p>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* ── SECTION: Table ── */}
        <Section title="Table (Sticky Header + Row Hover)">
          <Card>
            <div className="max-h-60 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { id: 'ORD-001', name: 'Rahul Sharma', status: 'delivered' as const, amount: '₹3,450' },
                    { id: 'ORD-002', name: 'Priya Patel', status: 'shipped' as const, amount: '₹1,200' },
                    { id: 'ORD-003', name: 'Amit Kumar', status: 'processing' as const, amount: '₹8,900' },
                    { id: 'ORD-004', name: 'Sneha Reddy', status: 'paid' as const, amount: '₹2,100' },
                    { id: 'ORD-005', name: 'Vikash Gupta', status: 'cancelled' as const, amount: '₹650' },
                    { id: 'ORD-006', name: 'Anita Desai', status: 'new' as const, amount: '₹4,200' },
                    { id: 'ORD-007', name: 'Ravi Nair', status: 'rto' as const, amount: '₹1,800' },
                  ].map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono font-medium">{row.id}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell><StatusChip status={row.status} /></TableCell>
                      <TableCell className="text-right font-mono">{row.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </Section>

        {/* ── SECTION: Tabs ── */}
        <Section title="Tabs (Underline Style)">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Overview tab content — animated entrance on switch.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="analytics">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Analytics tab content.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="settings">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Settings tab content.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </Section>

        {/* ── SECTION: Modal & Drawer ── */}
        <Section title="Modal & Right Drawer">
          <div className="flex gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open Modal</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Action</DialogTitle>
                  <DialogDescription>Are you sure you want to proceed? This action cannot be undone.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Open Drawer</Button>
              </SheetTrigger>
              <SheetContent className="sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Order Details</SheetTitle>
                  <SheetDescription>Right-side panel for detail views, editing, and dispatch actions.</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label>Customer Name</Label>
                    <Input defaultValue="Rahul Sharma" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select defaultValue="shipped">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full">Save Changes</Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </Section>

        {/* ── SECTION: Toasts ── */}
        <Section title="Toast Notifications">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => toast.success('Order #ORD-042 confirmed!', { description: 'Invoice generated successfully.' })}>
              Success Toast
            </Button>
            <Button variant="outline" onClick={() => toast.error('Payment failed', { description: 'Card declined — please retry.' })}>
              Error Toast
            </Button>
            <Button variant="outline" onClick={() => toast.warning('Low stock alert', { description: 'Slim Fit Polo — only 3 units left.' })}>
              Warning Toast
            </Button>
            <Button variant="outline" onClick={() => toast.info('Sync complete', { description: 'Pulled 12 new orders from Amazon.' })}>
              Info Toast
            </Button>
          </div>
        </Section>

        {/* ── SECTION: Work Queue Card ── */}
        <Section title="Work Queue Card (SLA-first)">
          <div className="space-y-3 max-w-xl">
            <WorkQueueCard
              orderNumber="#ORD-2024-0041"
              customerName="Priya Patel"
              itemCount={3}
              status="paid"
              slaDeadline={new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()}
              channel="Amazon"
              actions={<Button size="sm">Pack</Button>}
            />
            <WorkQueueCard
              orderNumber="#ORD-2024-0042"
              customerName="Amit Kumar"
              itemCount={1}
              status="processing"
              slaDeadline={new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()}
              channel="Website"
              actions={<Button size="sm" variant="outline">View</Button>}
            />
            <WorkQueueCard
              orderNumber="#ORD-2024-0043"
              customerName="Sneha Reddy"
              itemCount={5}
              status="processing"
              slaDeadline={new Date(Date.now() + 20 * 60 * 1000).toISOString()}
              channel="Flipkart"
              actions={<Button size="sm" variant="destructive">Urgent</Button>}
            />
            <WorkQueueCard
              orderNumber="#ORD-2024-0044"
              customerName="Vikash Gupta"
              itemCount={2}
              status="created"
              slaDeadline={new Date(Date.now() - 30 * 60 * 1000).toISOString()}
              channel="Myntra"
              actions={<Button size="sm" variant="destructive">Escalate</Button>}
            />
          </div>
        </Section>

        {/* ── SECTION: Empty State ── */}
        <Section title="Empty State">
          <Card className="max-w-lg">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Inbox className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>No orders yet</EmptyTitle>
                <EmptyDescription>
                  When customers place orders, they'll appear here. Connect a sales channel to get started.
                </EmptyDescription>
              </EmptyHeader>
              <Button size="sm">Connect Channel</Button>
            </Empty>
          </Card>
        </Section>
      </div>
    </DashboardLayout>
  );
}

/* ── Helper Components ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-heading">{title}</h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </section>
  );
}

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`h-10 w-10 rounded-lg ${className}`} />
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

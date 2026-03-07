import { useState, useEffect, useCallback } from 'react';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  TrendingUp, Tag, Gift, Repeat, Plus, Zap, Percent, Loader2,
  Pause, Play, Pencil, Trash2, CalendarIcon, ShoppingBag, Users,
  Sparkles, PartyPopper, Layers, Star, ArrowRight, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Offer {
  id: string;
  name: string;
  type: string;
  value: string;
  status: string;
  expires_at: string | null;
  created_at: string;
}

interface OfferForm {
  name: string;
  type: string;
  value: string;
  expires_at: Date | undefined;
}

const emptyForm: OfferForm = { name: '', type: 'discount', value: '', expires_at: undefined };

const campaignSuggestions = [
  { icon: Users, title: 'First-time buyer discount', desc: 'Welcome new customers with an introductory offer', prefill: { name: 'Welcome Offer — 10% Off First Order', type: 'discount', value: '10% off' } },
  { icon: Package, title: 'Boost slow movers', desc: 'Clear slow-moving inventory with targeted discounts', prefill: { name: 'Clearance Sale', type: 'discount', value: '20% off' } },
  { icon: Repeat, title: 'Reward repeat customers', desc: 'Give loyal customers exclusive perks', prefill: { name: 'Loyalty Reward — Free Gift', type: 'freebie', value: 'Free accessory on orders above ₹3,000' } },
  { icon: Zap, title: 'Weekend flash sale', desc: 'Drive weekend traffic with limited-time deals', prefill: { name: 'Weekend Flash Sale', type: 'discount', value: '15% off all items' } },
  { icon: Layers, title: 'Category sale', desc: 'Run a sale on a specific product category', prefill: { name: 'Category Sale', type: 'discount', value: '25% off selected category' } },
  { icon: PartyPopper, title: 'Festive promotion', desc: 'Seasonal and festive campaign to boost visibility', prefill: { name: 'Festive Special Offer', type: 'bundle', value: 'Buy 2 Get 1 Free' } },
];

export default function Growth() {
  const { currentStore } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [form, setForm] = useState<OfferForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Offers tab filter
  const [offerFilter, setOfferFilter] = useState<'all' | 'active' | 'paused' | 'expired'>('all');

  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const offersQuery = supabase
      .from('offers')
      .select('id, name, type, value, status, expires_at, created_at')
      .order('created_at', { ascending: false });
    if (currentStore) offersQuery.eq('store_id', currentStore.id);

    const productsQuery = supabase.from('products').select('id, name, base_price, mrp, category, is_active').eq('is_active', true).limit(20);

    const ordersQuery = supabase.from('orders').select('id, total', { count: 'exact' });
    if (currentStore) ordersQuery.eq('store_id', currentStore.id);

    const [offersRes, productsRes, ordersRes] = await Promise.all([offersQuery, productsQuery, ordersQuery]);

    if (offersRes.data) setOffers(offersRes.data as unknown as Offer[]);
    if (productsRes.data) setProducts(productsRes.data);
    if (ordersRes.data) {
      setOrderCount(ordersRes.count ?? ordersRes.data.length);
      setTotalRevenue(ordersRes.data.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0));
    }
    setLoading(false);
  }, [currentStore]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Offer CRUD
  const openCreate = (prefill?: Partial<OfferForm>) => {
    setEditingOffer(null);
    setForm({ ...emptyForm, ...prefill });
    setShowDialog(true);
  };

  const openEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setForm({
      name: offer.name,
      type: offer.type,
      value: offer.value,
      expires_at: offer.expires_at ? new Date(offer.expires_at) : undefined,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.value) { toast.error('Fill all required fields'); return; }
    if (!user) { toast.error('Please log in'); return; }
    setSaving(true);

    const payload: any = {
      name: form.name,
      type: form.type,
      value: form.value,
      expires_at: form.expires_at ? form.expires_at.toISOString() : null,
    };

    if (editingOffer) {
      const { error } = await supabase.from('offers').update(payload).eq('id', editingOffer.id);
      if (error) toast.error('Failed to update offer');
      else toast.success('Offer updated');
    } else {
      payload.status = 'active';
      payload.store_id = currentStore?.id || null;
      payload.created_by = user.id;
      const { error } = await supabase.from('offers').insert(payload);
      if (error) toast.error('Failed to create offer');
      else toast.success('Offer created');
    }

    setSaving(false);
    setShowDialog(false);
    setForm(emptyForm);
    setEditingOffer(null);
    fetchData();
  };

  const toggleOfferStatus = async (offer: Offer) => {
    const newStatus = offer.status === 'active' ? 'paused' : 'active';
    const { error } = await supabase.from('offers').update({ status: newStatus }).eq('id', offer.id);
    if (error) toast.error('Failed to update');
    else {
      toast.success(`Offer ${newStatus === 'active' ? 'resumed' : 'paused'}`);
      fetchData();
    }
  };

  const deleteOffer = async (id: string) => {
    const { error } = await supabase.from('offers').delete().eq('id', id);
    if (error) toast.error('Failed to delete offer');
    else {
      toast.success('Offer deleted');
      fetchData();
    }
  };

  // Derived
  const activeOffers = offers.filter(o => o.status === 'active');
  const filteredOffers = offerFilter === 'all' ? offers : offers.filter(o => o.status === offerFilter);
  const productCount = products.length;

  const formatExpiry = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const offerTypeIcon = (type: string) => {
    switch (type) {
      case 'discount': return <Percent className="h-4 w-4" />;
      case 'bundle': return <Layers className="h-4 w-4" />;
      case 'freebie': return <Gift className="h-4 w-4" />;
      case 'cashback': return <TrendingUp className="h-4 w-4" />;
      default: return <Tag className="h-4 w-4" />;
    }
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      active: 'default',
      paused: 'secondary',
      expired: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'outline'} className="text-[10px] capitalize">
        {status === 'active' && <Zap className="h-2.5 w-2.5 mr-0.5" />}
        {status}
      </Badge>
    );
  };

  // Stat cards data
  const stats = [
    { label: 'Active Offers', value: activeOffers.length, icon: Tag, color: 'text-primary' },
    { label: 'Total Orders', value: orderCount, icon: ShoppingBag, color: 'text-success' },
    { label: 'Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-accent-foreground' },
    { label: 'Products', value: productCount, icon: Package, color: 'text-info' },
  ];

  if (loading) {
    return (
      <SellerOSLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SellerOSLayout>
    );
  }

  return (
    <SellerOSLayout>
      <div className="space-y-5 animate-fade-in max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Growth</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Run offers, boost sales & grow your store</p>
          </div>
          <Button size="sm" onClick={() => openCreate()} className="min-h-[44px] gap-1.5">
            <Plus className="h-4 w-4" /> New Offer
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="offers">Offers</TabsTrigger>
            <TabsTrigger value="grow">Grow</TabsTrigger>
          </TabsList>

          {/* ─── OVERVIEW ─── */}
          <TabsContent value="overview">
            <div className="space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                {stats.map(s => (
                  <Card key={s.label}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <s.icon className={cn('h-4.5 w-4.5', s.color)} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="text-lg font-bold text-foreground">{s.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Quick Actions */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</h2>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Create Offer', icon: Plus, action: () => openCreate() },
                    { label: 'View Products', icon: Package, action: () => navigate('/catalogue') },
                    { label: 'Customers', icon: Users, action: () => navigate('/customers') },
                  ].map(a => (
                    <button
                      key={a.label}
                      onClick={a.action}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors min-h-[80px]"
                    >
                      <a.icon className="h-5 w-5 text-primary" />
                      <span className="text-xs font-medium text-foreground">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Offers Preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active Offers</h2>
                  {activeOffers.length > 0 && (
                    <button onClick={() => setActiveTab('offers')} className="text-xs text-primary font-medium flex items-center gap-0.5">
                      View All <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {activeOffers.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">No active offers yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Create your first offer to boost sales.</p>
                      <Button size="sm" className="mt-3 min-h-[40px]" onClick={() => openCreate()}>
                        <Plus className="h-4 w-4 mr-1" /> Create Offer
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {activeOffers.slice(0, 3).map(offer => (
                      <OfferRow key={offer.id} offer={offer} onEdit={openEdit} onToggle={toggleOfferStatus} onDelete={deleteOffer} formatExpiry={formatExpiry} typeIcon={offerTypeIcon} statusBadge={statusBadge} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ─── OFFERS ─── */}
          <TabsContent value="offers">
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'active', 'paused', 'expired'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setOfferFilter(f)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors border',
                      offerFilter === f
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:bg-muted/50'
                    )}
                  >
                    {f}
                    {f !== 'all' && ` (${offers.filter(o => o.status === f).length})`}
                  </button>
                ))}
              </div>

              {/* Offer List */}
              {filteredOffers.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">
                      {offerFilter === 'all' ? 'No offers yet' : `No ${offerFilter} offers`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Create your first offer to boost sales.</p>
                    <Button size="sm" className="mt-3 min-h-[40px]" onClick={() => openCreate()}>
                      <Plus className="h-4 w-4 mr-1" /> Create Offer
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filteredOffers.map(offer => (
                    <OfferRow key={offer.id} offer={offer} onEdit={openEdit} onToggle={toggleOfferStatus} onDelete={deleteOffer} formatExpiry={formatExpiry} typeIcon={offerTypeIcon} statusBadge={statusBadge} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── GROW ─── */}
          <TabsContent value="grow">
            <div className="space-y-6">
              {/* Campaign Suggestions */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Campaign Ideas</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {campaignSuggestions.map(s => (
                    <Card key={s.title} className="hover:border-primary/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <s.icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{s.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2.5 min-h-[36px] text-xs"
                              onClick={() => openCreate({ name: s.prefill.name, type: s.prefill.type, value: s.prefill.value })}
                            >
                              <Sparkles className="h-3 w-3 mr-1" /> Create This Offer
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Product Spotlight */}
              {products.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Product Spotlight</h2>
                  <div className="space-y-2">
                    {products.slice(0, 6).map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Star className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ₹{Number(p.base_price).toLocaleString('en-IN')} · {p.category}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-[36px] text-xs shrink-0"
                          onClick={() => openCreate({ name: `Promo — ${p.name}`, type: 'discount', value: '10% off' })}
                        >
                          Promote
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Create / Edit Offer Dialog ─── */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) { setShowDialog(false); setEditingOffer(null); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOffer ? 'Edit Offer' : 'Create Offer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Offer Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Weekend Special"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Discount</SelectItem>
                  <SelectItem value="bundle">Bundle</SelectItem>
                  <SelectItem value="freebie">Freebie</SelectItem>
                  <SelectItem value="cashback">Cashback</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value *</Label>
              <Input
                value={form.value}
                onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                placeholder="e.g. 15% or Buy 2 Get 1"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full mt-1.5 justify-start text-left font-normal',
                      !form.expires_at && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.expires_at ? format(form.expires_at, 'PPP') : 'No expiry'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.expires_at}
                    onSelect={d => setForm(p => ({ ...p, expires_at: d }))}
                    disabled={d => d < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {form.expires_at && (
                <button onClick={() => setForm(p => ({ ...p, expires_at: undefined }))} className="text-xs text-destructive mt-1">
                  Clear expiry
                </button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingOffer(null); setForm(emptyForm); }} className="min-h-[44px]">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="min-h-[44px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingOffer ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SellerOSLayout>
  );
}

// ─── Offer Row Component ───
function OfferRow({
  offer, onEdit, onToggle, onDelete, formatExpiry, typeIcon, statusBadge,
}: {
  offer: Offer;
  onEdit: (o: Offer) => void;
  onToggle: (o: Offer) => void;
  onDelete: (id: string) => void;
  formatExpiry: (d: string | null) => string | null;
  typeIcon: (type: string) => React.ReactNode;
  statusBadge: (status: string) => React.ReactNode;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
        {typeIcon(offer.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground truncate">{offer.name}</p>
          {statusBadge(offer.status)}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {offer.value}
          {offer.expires_at && ` · Ends ${formatExpiry(offer.expires_at)}`}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggle(offer)} title={offer.status === 'active' ? 'Pause' : 'Resume'}>
          {offer.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(offer)} title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {confirmDelete ? (
          <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => { onDelete(offer.id); setConfirmDelete(false); }}>
            Confirm
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete(true)} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

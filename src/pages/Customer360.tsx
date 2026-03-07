import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, ShoppingBag, TrendingUp,
  Gift, Tag, MessageCircle, Instagram, Globe, Store, FileSpreadsheet, Edit,
  Save, X, Star, Package, Clock, DollarSign, BarChart3, Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CHANNEL_CONFIG, type SalesChannel } from '@/lib/channelConnectors';

interface CustomerProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  date_of_birth: string | null;
  last_order_date: string | null;
  fume_points_balance: number;
  created_at: string;
  is_blacklisted: boolean;
  preferred_channel: string | null;
  communication_opt_in: boolean;
  instagram_handle: string | null;
  whatsapp_number: string | null;
  tags: string[] | null;
  imported_order_count: number;
  imported_total_spent: number;
}

interface OrderRow {
  id: string;
  order_number: string;
  invoice_number: string | null;
  status: string;
  channel: string;
  fulfillment_status: string;
  total: number;
  subtotal: number;
  created_at: string;
  is_voided: boolean;
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  in_store: Store,
  website: Globe,
  instagram: Instagram,
  whatsapp: MessageCircle,
  marketplace: ShoppingBag,
  csv_import: FileSpreadsheet,
};

export default function Customer360() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CustomerProfile>>({});
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const [custRes, ordersRes] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id!).single(),
      supabase.from('orders').select('id, order_number, invoice_number, status, channel, fulfillment_status, total, subtotal, created_at, is_voided').eq('customer_id', id!).order('created_at', { ascending: false }),
    ]);
    if (custRes.data) {
      setCustomer(custRes.data as CustomerProfile);
      setEditForm(custRes.data as CustomerProfile);
    }
    setOrders((ordersRes.data as OrderRow[]) || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!customer) return;
    const { error } = await supabase.from('customers').update({
      name: editForm.name,
      email: editForm.email || null,
      phone: editForm.phone || null,
      address: editForm.address || null,
      notes: editForm.notes || null,
      date_of_birth: editForm.date_of_birth || null,
      preferred_channel: editForm.preferred_channel,
      communication_opt_in: editForm.communication_opt_in,
      instagram_handle: editForm.instagram_handle || null,
      whatsapp_number: editForm.whatsapp_number || null,
      tags: editForm.tags || [],
    }).eq('id', customer.id);

    if (error) { toast.error('Failed to save'); return; }
    toast.success('Customer updated');
    setEditing(false);
    fetchData();
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag) return;
    const current = editForm.tags || [];
    if (current.includes(tag)) { toast.error('Tag already exists'); return; }
    setEditForm({ ...editForm, tags: [...current, tag] });
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    setEditForm({ ...editForm, tags: (editForm.tags || []).filter(t => t !== tag) });
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (!customer) return (
    <DashboardLayout>
      <div className="text-center py-20">
        <User className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-semibold">Customer not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/customers')}>Back to Customers</Button>
      </div>
    </DashboardLayout>
  );

  // Computed stats
  const totalOrders = orders.length + customer.imported_order_count;
  const totalSpent = orders.reduce((s, o) => s + Number(o.total), 0) + Number(customer.imported_total_spent);
  const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const daysSinceFirst = Math.floor((Date.now() - new Date(customer.created_at).getTime()) / 86400000);
  const ltvMonthly = daysSinceFirst > 30 ? (totalSpent / (daysSinceFirst / 30)) : totalSpent;

  // Channel breakdown
  const channelBreakdown = orders.reduce<Record<string, { count: number; total: number }>>((acc, o) => {
    const ch = o.channel || 'in_store';
    if (!acc[ch]) acc[ch] = { count: 0, total: 0 };
    acc[ch].count++;
    acc[ch].total += Number(o.total);
    return acc;
  }, {});

  // Status tier
  let tier: 'VIP' | 'Gold' | 'Silver' | 'New' = 'New';
  if (totalSpent >= 500000) tier = 'VIP';
  else if (totalSpent >= 100000) tier = 'Gold';
  else if (totalSpent >= 25000) tier = 'Silver';

  const tierColors = { VIP: 'bg-warning/10 text-warning border-warning/30', Gold: 'bg-warning/10 text-warning border-warning/30', Silver: 'bg-muted text-muted-foreground border-border', New: 'bg-info/10 text-info border-info/30' };

  const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const canEdit = role === 'admin' || role === 'manager' || role === 'sales';

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Back + Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-display">{customer.name}</h1>
              <Badge variant="outline" className={cn('text-xs', tierColors[tier])}>
                <Star className="w-3 h-3 mr-1" />
                {tier}
              </Badge>
              {customer.is_blacklisted && (
                <Badge variant="destructive" className="text-xs">Blacklisted</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Customer since {fmtDate(customer.created_at)}</p>
          </div>
          {canEdit && (
            editing ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setEditing(false); setEditForm(customer); }}><X className="w-4 h-4 mr-1" />Cancel</Button>
                <Button onClick={handleSave}><Save className="w-4 h-4 mr-1" />Save</Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setEditing(true)}><Edit className="w-4 h-4 mr-1" />Edit Profile</Button>
            )
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Lifetime Value', value: fmt(totalSpent), icon: TrendingUp, sub: `${totalOrders} orders` },
            { label: 'Avg Order Value', value: fmt(avgOrderValue), icon: DollarSign, sub: 'per order' },
            { label: 'Monthly LTV', value: fmt(ltvMonthly), icon: BarChart3, sub: `over ${Math.max(1, Math.round(daysSinceFirst / 30))} months` },
            { label: 'Loyalty Points', value: customer.fume_points_balance.toLocaleString(), icon: Gift, sub: 'Fume Points balance' },
          ].map((kpi, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold mt-1">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <kpi.icon className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Profile + Communication */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-semibold text-sm">Contact Information</h3>
              {editing ? (
                <div className="space-y-3">
                  <div><Label className="text-xs">Name</Label><Input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                  <div><Label className="text-xs">Phone</Label><Input value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                  <div><Label className="text-xs">Email</Label><Input value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
                  <div><Label className="text-xs">Address</Label><Textarea value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} rows={2} /></div>
                  <div><Label className="text-xs">Date of Birth</Label><Input type="date" value={editForm.date_of_birth || ''} onChange={e => setEditForm({ ...editForm, date_of_birth: e.target.value })} /></div>
                  <div><Label className="text-xs">Notes</Label><Textarea value={editForm.notes || ''} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={2} /></div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  {[
                    { icon: Phone, value: customer.phone, label: 'Phone' },
                    { icon: Mail, value: customer.email, label: 'Email' },
                    { icon: MapPin, value: customer.address, label: 'Address' },
                    { icon: Calendar, value: customer.date_of_birth ? fmtDate(customer.date_of_birth) : null, label: 'Birthday' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <item.icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className={cn(!item.value && 'text-muted-foreground italic')}>{item.value || 'Not set'}</p>
                      </div>
                    </div>
                  ))}
                  {customer.notes && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{customer.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Communication Preferences */}
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-semibold text-sm">Communication Preferences</h3>
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Preferred Channel</Label>
                    <Select value={editForm.preferred_channel || 'whatsapp'} onValueChange={v => setEditForm({ ...editForm, preferred_channel: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">WhatsApp Number</Label><Input value={editForm.whatsapp_number || ''} onChange={e => setEditForm({ ...editForm, whatsapp_number: e.target.value })} placeholder="+91..." /></div>
                  <div><Label className="text-xs">Instagram Handle</Label><Input value={editForm.instagram_handle || ''} onChange={e => setEditForm({ ...editForm, instagram_handle: e.target.value })} placeholder="@handle" /></div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Marketing Opt-in</Label>
                    <Switch checked={editForm.communication_opt_in ?? true} onCheckedChange={v => setEditForm({ ...editForm, communication_opt_in: v })} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Heart className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Preferred Channel</p>
                      <p className="capitalize">{customer.preferred_channel || 'WhatsApp'}</p>
                    </div>
                  </div>
                  {customer.whatsapp_number && (
                    <div className="flex items-center gap-3">
                      <MessageCircle className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">WhatsApp</p>
                        <p>{customer.whatsapp_number}</p>
                      </div>
                    </div>
                  )}
                  {customer.instagram_handle && (
                    <div className="flex items-center gap-3">
                      <Instagram className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Instagram</p>
                        <p>{customer.instagram_handle}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Marketing</p>
                      <p>{customer.communication_opt_in ? '✅ Opted in' : '❌ Opted out'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="glass-card p-5 space-y-3">
              <h3 className="font-semibold text-sm">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {(editing ? editForm.tags : customer.tags)?.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                    {editing && (
                      <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                    )}
                  </Badge>
                ))}
                {(!editing && (!customer.tags || customer.tags.length === 0)) && (
                  <p className="text-xs text-muted-foreground italic">No tags</p>
                )}
              </div>
              {editing && (
                <div className="flex gap-2">
                  <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add tag..." className="text-sm" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                  <Button size="sm" variant="outline" onClick={addTag}>Add</Button>
                </div>
              )}
            </div>
          </div>

          {/* Right column: Channel Breakdown + Order History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Channel Breakdown */}
            <div className="glass-card p-5">
              <h3 className="font-semibold text-sm mb-4">Channel Breakdown</h3>
              {Object.keys(channelBreakdown).length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No order data yet</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(channelBreakdown).map(([ch, data]) => {
                    const cfg = CHANNEL_CONFIG[ch as SalesChannel] || CHANNEL_CONFIG.in_store;
                    const ChIcon = CHANNEL_ICONS[ch] || Package;
                    return (
                      <div key={ch} className="border border-border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.color)}>
                            <ChIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-lg font-bold">{data.count}</p>
                        <p className="text-xs text-muted-foreground">{fmt(data.total)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Order History */}
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">Order History</h3>
                <p className="text-sm text-muted-foreground">{orders.length} orders from this customer</p>
              </div>
              {orders.length === 0 ? (
                <div className="p-8 text-center">
                  <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No orders yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left p-3 font-medium text-muted-foreground">Channel</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Order #</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => {
                        const cfg = CHANNEL_CONFIG[(order.channel || 'in_store') as SalesChannel] || CHANNEL_CONFIG.in_store;
                        const ChIcon = CHANNEL_ICONS[order.channel] || Package;
                        return (
                          <tr
                            key={order.id}
                            className="border-t border-border cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => navigate(`/orders/${order.id}`)}
                          >
                            <td className="p-3">
                              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.color)}>
                                <ChIcon className="w-3 h-3" />
                                {cfg.label}
                              </span>
                            </td>
                            <td className="p-3 font-medium">{order.invoice_number || order.order_number}</td>
                            <td className="p-3 text-muted-foreground">{fmtDate(order.created_at)}</td>
                            <td className="p-3">
                              <span className={cn('status-badge capitalize', order.is_voided && 'opacity-50')}>
                                {order.is_voided ? 'Voided' : order.status}
                              </span>
                            </td>
                            <td className="p-3 text-right font-semibold">{fmt(Number(order.total))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

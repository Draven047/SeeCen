import { useState } from 'react';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  TrendingUp, Target, Tag, Megaphone, Gift, Repeat,
  ChevronRight, Plus, Zap, Clock, CheckCircle, Percent,
} from 'lucide-react';
import { toast } from 'sonner';

interface GrowthGoal {
  icon: any;
  title: string;
  desc: string;
  color: string;
  metric?: string;
}

const growthGoals: GrowthGoal[] = [
  { icon: Target, title: 'Increase first-time buyers', desc: 'Attract new customers with welcome offers', color: 'bg-primary/10 text-primary', metric: '+15% this month' },
  { icon: TrendingUp, title: 'Boost average order value', desc: 'Bundle deals & minimum cart offers', color: 'bg-success/10 text-success', metric: '₹2,450 current AOV' },
  { icon: Tag, title: 'Move slow inventory', desc: 'Flash sales on aging stock', color: 'bg-warning/10 text-warning', metric: '12 items aging' },
  { icon: Megaphone, title: 'Promote festive collection', desc: 'Seasonal campaigns & visibility boosts', color: 'bg-info/10 text-info' },
  { icon: Gift, title: 'Reward repeat customers', desc: 'Loyalty points & exclusive offers', color: 'bg-accent text-accent-foreground', metric: '34 repeat buyers' },
  { icon: Repeat, title: 'Boost weekend sales', desc: 'Weekend-specific promotions', color: 'bg-destructive/10 text-destructive' },
];

interface Offer {
  id: string;
  name: string;
  type: string;
  value: string;
  status: 'active' | 'scheduled' | 'ended';
  expires?: string;
}

// Mock active offers
const mockOffers: Offer[] = [
  { id: '1', name: 'Welcome 10% Off', type: 'discount', value: '10%', status: 'active', expires: '31 Mar 2026' },
  { id: '2', name: 'Bundle: Buy 3 Get 1', type: 'bundle', value: 'B3G1', status: 'active' },
];

export default function Growth() {
  const [offers, setOffers] = useState<Offer[]>(mockOffers);
  const [showCreate, setShowCreate] = useState(false);
  const [newOffer, setNewOffer] = useState({ name: '', type: 'discount', value: '' });

  const handleCreate = () => {
    if (!newOffer.name || !newOffer.value) { toast.error('Fill all fields'); return; }
    setOffers(prev => [...prev, {
      id: Date.now().toString(),
      name: newOffer.name,
      type: newOffer.type,
      value: newOffer.value,
      status: 'active',
    }]);
    setShowCreate(false);
    setNewOffer({ name: '', type: 'discount', value: '' });
    toast.success('Offer created');
  };

  return (
    <SellerOSLayout>
      <div className="space-y-5 animate-fade-in max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Growth</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Choose a goal or create an offer</p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="min-h-[44px] gap-1.5">
            <Plus className="h-4 w-4" />
            New Offer
          </Button>
        </div>

        {/* Active Offers */}
        {offers.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Active offers</h2>
            <div className="space-y-2.5">
              {offers.map(offer => (
                <div key={offer.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                    {offer.type === 'discount' ? <Percent className="h-4 w-4 text-success" /> : <Gift className="h-4 w-4 text-success" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{offer.name}</p>
                      <Badge variant={offer.status === 'active' ? 'default' : 'outline'} className="text-[10px]">
                        {offer.status === 'active' && <Zap className="h-2.5 w-2.5 mr-0.5" />}
                        {offer.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {offer.value} {offer.expires && `· Ends ${offer.expires}`}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goal Cards */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Growth goals</h2>
          <div className="space-y-2.5">
            {growthGoals.map((goal) => (
              <button
                key={goal.title}
                className="flex items-center gap-4 w-full p-4 rounded-xl border border-border bg-card hover:bg-muted/30 active:scale-[0.99] transition-all text-left min-h-[64px]"
              >
                <div className={cn('w-11 h-11 rounded-full flex items-center justify-center shrink-0', goal.color)}>
                  <goal.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{goal.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{goal.desc}</p>
                  {goal.metric && (
                    <p className="text-[11px] font-medium text-primary mt-1">{goal.metric}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Create Offer Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Offer Name</Label>
              <Input
                value={newOffer.name}
                onChange={e => setNewOffer(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Weekend Special"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newOffer.type} onValueChange={v => setNewOffer(p => ({ ...p, type: v }))}>
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
              <Label>Value</Label>
              <Input
                value={newOffer.value}
                onChange={e => setNewOffer(p => ({ ...p, value: e.target.value }))}
                placeholder="e.g. 15% or Buy 2 Get 1"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="min-h-[44px]">Cancel</Button>
            <Button onClick={handleCreate} className="min-h-[44px]">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SellerOSLayout>
  );
}

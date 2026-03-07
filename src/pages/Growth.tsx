import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { TrendingUp, Target, Tag, Megaphone, Gift, Repeat, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const growthGoals = [
  {
    icon: Target,
    title: 'Increase first-time buyers',
    desc: 'Attract new customers with welcome offers',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: TrendingUp,
    title: 'Boost average order value',
    desc: 'Bundle deals & minimum cart offers',
    color: 'bg-success/10 text-success',
  },
  {
    icon: Tag,
    title: 'Move slow inventory',
    desc: 'Flash sales on aging stock',
    color: 'bg-warning/10 text-warning',
  },
  {
    icon: Megaphone,
    title: 'Promote festive collection',
    desc: 'Seasonal campaigns & visibility boosts',
    color: 'bg-info/10 text-info',
  },
  {
    icon: Gift,
    title: 'Reward repeat customers',
    desc: 'Loyalty points & exclusive offers',
    color: 'bg-accent text-accent-foreground',
  },
  {
    icon: Repeat,
    title: 'Boost weekend sales',
    desc: 'Weekend-specific promotions',
    color: 'bg-destructive/10 text-destructive',
  },
];

export default function Growth() {
  return (
    <SellerOSLayout>
      <div className="space-y-5 animate-fade-in max-w-2xl">
        <div>
          <h1 className="text-lg font-bold text-foreground">Growth</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a goal to get started</p>
        </div>

        <div className="space-y-3">
          {growthGoals.map((goal) => (
            <button
              key={goal.title}
              className="flex items-center gap-4 w-full p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors text-left"
            >
              <div className={cn('w-11 h-11 rounded-full flex items-center justify-center shrink-0', goal.color)}>
                <goal.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{goal.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{goal.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </SellerOSLayout>
  );
}

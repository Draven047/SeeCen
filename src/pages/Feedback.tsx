import { useState } from 'react';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { cn } from '@/lib/utils';
import { MessageSquareWarning, Star, RotateCcw } from 'lucide-react';

const tabs = [
  { id: 'complaints', label: 'Complaints', icon: MessageSquareWarning },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'returns', label: 'Returns', icon: RotateCcw },
] as const;

type TabId = typeof tabs[number]['id'];

export default function Feedback() {
  const [activeTab, setActiveTab] = useState<TabId>('complaints');

  return (
    <SellerOSLayout>
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-lg font-bold text-foreground">Feedback</h1>

        {/* Pill Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[40px]',
                activeTab === tab.id
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'complaints' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquareWarning className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No complaints</p>
            <p className="text-xs text-muted-foreground mt-1">Great! Your store has no pending complaints.</p>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Star className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No reviews yet</p>
            <p className="text-xs text-muted-foreground mt-1">Customer reviews will appear here.</p>
          </div>
        )}

        {activeTab === 'returns' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <RotateCcw className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No return requests</p>
            <p className="text-xs text-muted-foreground mt-1">Active return requests will show here.</p>
          </div>
        )}
      </div>
    </SellerOSLayout>
  );
}

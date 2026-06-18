import { useStore } from '@/contexts/StoreContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StoreSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { stores, currentStore, setCurrentStoreId } = useStore();

  if (stores.length <= 1) {
    if (!currentStore) return null;
    return (
      <div className={cn(
        "flex min-h-[44px] items-center gap-2 rounded-[16px] bg-[#f1f2f5] px-3 py-2 text-[#17191c]",
        collapsed && "justify-center px-0"
      )}>
        <Store className="h-4 w-4 shrink-0 text-[#747b86]" />
        {!collapsed && <span className="truncate text-sm font-bold">{currentStore.name}</span>}
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="flex min-h-[44px] items-center justify-center rounded-[16px] bg-[#f1f2f5] px-0 py-2" title={currentStore?.name}>
        <Store className="h-4 w-4 text-[#747b86]" />
      </div>
    );
  }

  return (
    <Select value={currentStore?.id || ''} onValueChange={setCurrentStoreId}>
      <SelectTrigger className="min-h-[44px] rounded-[16px] border-0 bg-[#f1f2f5] px-3 text-sm font-bold text-[#17191c] shadow-none hover:bg-[#e7e9ee]">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 shrink-0 text-[#747b86]" />
          <SelectValue placeholder="Select store" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {stores.map(store => (
          <SelectItem key={store.id} value={store.id}>
            {store.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

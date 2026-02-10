import { useStore } from '@/contexts/StoreContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StoreSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { stores, currentStore, setCurrentStoreId } = useStore();

  if (stores.length <= 1) {
    if (!currentStore) return null;
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50", collapsed && "justify-center")}>
        <Store className="w-4 h-4 text-muted-foreground shrink-0" />
        {!collapsed && <span className="text-sm font-medium truncate">{currentStore.name}</span>}
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="flex items-center justify-center px-3 py-2 rounded-lg bg-muted/50" title={currentStore?.name}>
        <Store className="w-4 h-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Select value={currentStore?.id || ''} onValueChange={setCurrentStoreId}>
      <SelectTrigger className="bg-muted/50 border-0 h-9 text-sm">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-muted-foreground shrink-0" />
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

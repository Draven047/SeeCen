import * as React from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  href: string;
  icon?: React.ReactNode;
}

interface GlobalSearchProps {
  results?: SearchResult[];
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export function GlobalSearch({ results = [], onSearch, placeholder = "Search orders, customers, products…" }: GlobalSearchProps) {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  // Built-in quick actions
  const quickActions: SearchResult[] = [
    { id: '__new_order', title: 'Create New Order', subtitle: 'Shift+N', category: 'Quick Actions', href: '/demo/orders/new' },
    { id: '__orders', title: 'View Orders', category: 'Quick Actions', href: '/demo/orders' },
    { id: '__customers', title: 'View Customers', category: 'Quick Actions', href: '/demo/customers' },
    { id: '__dashboard', title: 'Go to Dashboard', category: 'Quick Actions', href: '/demo/dashboard' },
  ];

  const allResults = [...quickActions, ...results];

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const grouped = React.useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    allResults.forEach((r) => {
      (groups[r.category] ??= []).push(r);
    });
    return groups;
  }, [allResults]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary",
          "w-64 justify-start",
        )}
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">{placeholder}</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={placeholder}
          onValueChange={(v) => onSearch?.(v)}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(grouped).map(([category, items]) => (
            <CommandGroup key={category} heading={category}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => {
                    navigate(item.href);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  {item.icon}
                  <div className="flex flex-col">
                    <span className="text-sm">{item.title}</span>
                    {item.subtitle && (
                      <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

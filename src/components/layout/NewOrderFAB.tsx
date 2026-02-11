import { Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export function NewOrderFAB() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Hide on the create-order page itself
  if (location.pathname === '/orders/new') return null;
  // Only show on mobile
  if (!isMobile) return null;

  return (
    <button
      onClick={() => navigate('/orders/new')}
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg',
        'h-14 px-5 text-sm font-semibold',
        'active:scale-95 transition-transform',
        'hover:bg-primary/90'
      )}
      aria-label="New Order"
    >
      <Plus className="h-5 w-5" />
      <span>Order</span>
    </button>
  );
}

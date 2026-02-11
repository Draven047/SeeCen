import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function useNewOrderShortcut() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      // Shift+N → New Order
      if (e.key === 'N' && e.shiftKey && !e.metaKey && !e.ctrlKey) {
        if (location.pathname !== '/orders/new') {
          e.preventDefault();
          navigate('/orders/new');
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate, location.pathname]);
}

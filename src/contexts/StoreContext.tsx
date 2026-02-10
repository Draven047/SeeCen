import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Store {
  id: string;
  name: string;
  address: string | null;
}

interface StoreContextType {
  stores: Store[];
  currentStore: Store | null;
  setCurrentStoreId: (id: string) => void;
  loading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStoreId, setCurrentStoreId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setStores([]); setLoading(false); return; }
    fetchStores();
  }, [user, role]);

  const fetchStores = async () => {
    setLoading(true);
    if (role === 'admin' || role === 'manager') {
      // Admins/managers see all stores
      const { data } = await supabase.from('stores').select('id, name, address').order('name');
      setStores(data || []);
      if (data && data.length > 0 && !currentStoreId) setCurrentStoreId(data[0].id);
    } else {
      // Other roles see only assigned stores
      const { data: assignments } = await supabase
        .from('store_assignments')
        .select('store:stores(id, name, address)')
        .eq('user_id', user!.id);

      const assigned = (assignments || []).map((a: any) => a.store).filter(Boolean) as Store[];
      setStores(assigned);
      if (assigned.length > 0 && !currentStoreId) setCurrentStoreId(assigned[0].id);
    }
    setLoading(false);
  };

  const currentStore = stores.find(s => s.id === currentStoreId) || null;

  return (
    <StoreContext.Provider value={{ stores, currentStore, setCurrentStoreId, loading }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}

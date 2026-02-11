import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NotificationsDropdown } from './NotificationsDropdown';
import { StoreSwitcher } from './StoreSwitcher';
import { Breadcrumbs } from './Breadcrumbs';
import { ChevronRight } from 'lucide-react';

export function Header() {
  const { user, role } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      setProfile(profileData);
    };
    fetchProfile();
  }, [user]);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    manager: 'Manager',
    sales: 'Sales',
    operations: 'Ops',
    finance: 'Finance',
    viewer: 'Viewer',
  };
  const roleLabel = roleLabels[role || ''] || 'User';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-6">
      {/* Left: Breadcrumbs */}
      <Breadcrumbs />

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        <NotificationsDropdown />

        {/* User pill */}
        <div className="flex items-center gap-2 rounded-full border bg-secondary/50 py-1 pl-1 pr-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block leading-none">
            <p className="text-xs font-medium text-foreground">{displayName}</p>
            <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

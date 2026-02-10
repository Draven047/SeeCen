import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NotificationsDropdown } from './NotificationsDropdown';

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
  const roleLabel = role === 'admin' ? 'Administrator' : role === 'operations' ? 'Operations' : 'Sales';

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Cigatrax</h1>
          <span className="text-sm text-muted-foreground">Welcome back, {displayName}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <NotificationsDropdown />
        
        {/* User Avatar */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserCog, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Employee {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_approved: boolean;
}

export default function Employees() {
  const { role } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data: roles } = await supabase.from('user_roles').select('user_id, role, is_approved');
    if (!roles) { setLoading(false); return; }

    const userIds = roles.map(r => r.user_id);
    const { data: profiles } = await supabase.from('profiles').select('id, email, full_name').in('id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const emps: Employee[] = roles.map(r => {
      const p = profileMap.get(r.user_id);
      return {
        id: r.user_id,
        email: p?.email || '',
        full_name: p?.full_name || null,
        role: r.role,
        is_approved: r.is_approved,
      };
    });
    setEmployees(emps);
    setLoading(false);
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-primary/10 text-primary',
    manager: 'bg-info/10 text-info',
    sales: 'bg-success/10 text-success',
    operations: 'bg-warning/10 text-warning',
    finance: 'bg-accent text-accent-foreground',
    viewer: 'bg-muted text-muted-foreground',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-display">Employees</h1>
          <p className="text-muted-foreground text-sm mt-1">View and manage team members across stores</p>
        </div>

        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></TableCell></TableRow>
              ) : employees.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No employees found</TableCell></TableRow>
              ) : employees.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.full_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                  <TableCell>
                    <Badge className={roleColors[emp.role] || ''} variant="outline">
                      {emp.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={emp.is_approved ? 'success' : 'warning'}>
                      {emp.is_approved ? 'Active' : 'Pending'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}

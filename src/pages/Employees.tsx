import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserCog, Users, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageLoading } from '@/components/ui/page-loading';

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

    type ProfileRow = { id: string; email: string | null; full_name: string | null };
    const profileMap = new Map<string, ProfileRow>(((profiles || []) as ProfileRow[]).map(p => [p.id, p]));
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
      <div className="mx-auto max-w-6xl space-y-5 animate-fade-in">
        <div className="rounded-[28px] border border-black/[0.04] bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <UserCog className="h-5 w-5" />
              </span>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">People operations</p>
              <h1 className="mt-1 text-4xl font-semibold tracking-[-0.05em] text-[#17191c]">Employees</h1>
              <p className="text-muted-foreground text-sm mt-2">View and manage team members across stores</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-2xl bg-primary/10 px-4 py-3 text-primary">
                <Users className="mb-1 h-4 w-4" />
                <p className="text-2xl font-bold">{employees.length}</p>
                <p className="text-xs font-medium">Team</p>
              </div>
              <div className="rounded-2xl bg-[#17191c] px-4 py-3 text-white">
                <ShieldCheck className="mb-1 h-4 w-4" />
                <p className="text-2xl font-bold">{employees.filter(e => e.is_approved).length}</p>
                <p className="text-xs font-medium">Active</p>
              </div>
            </div>
          </div>
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
                <TableRow><TableCell colSpan={4}><PageLoading label="Loading employees" rows={2} /></TableCell></TableRow>
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

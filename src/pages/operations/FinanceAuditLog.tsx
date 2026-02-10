import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Eye, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action_type: string;
  store_id: string | null;
  before_data: any;
  after_data: any;
  reason: string | null;
  performed_by: string;
  created_at: string;
  performer?: { full_name: string | null; email: string };
  store?: { name: string } | null;
}

interface Store {
  id: string;
  name: string;
}

export default function FinanceAuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStores();
    const today = new Date();
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    setDateFrom(monthAgo.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchLogs();
    }
  }, [dateFrom, dateTo, storeFilter, actionFilter]);

  const fetchStores = async () => {
    const { data } = await supabase.from('stores').select('id, name').order('name');
    setStores(data || []);
  };

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('finance_audit_logs')
      .select(`
        *,
        performer:profiles!finance_audit_logs_performed_by_fkey(full_name, email),
        store:stores(name)
      `)
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo + 'T23:59:59')
      .order('created_at', { ascending: false });

    if (storeFilter !== 'all') {
      query = query.eq('store_id', storeFilter);
    }
    if (actionFilter !== 'all') {
      query = query.eq('action_type', actionFilter);
    }

    const { data } = await query.limit(500);
    setLogs((data as unknown as AuditLog[]) || []);
    setLoading(false);
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'finalize_invoice': 'Finalize Invoice',
      'void_invoice': 'Void Invoice',
      'create_credit_note': 'Create Credit Note',
      'update_tax_settings': 'Update Tax Settings',
      'create_tax_settings': 'Create Tax Settings',
      'update_prefix': 'Update Series Prefix',
      'create_series': 'Create Series'
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes('void')) return 'bg-destructive/20 text-destructive';
    if (action.includes('create')) return 'bg-success/20 text-success';
    if (action.includes('update')) return 'bg-warning/20 text-warning';
    if (action.includes('finalize')) return 'bg-primary/20 text-primary';
    return 'bg-muted text-muted-foreground';
  };

  const actionTypes = [...new Set(logs.map(l => l.action_type))];

  const filtered = logs.filter(log => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.entity_id.toLowerCase().includes(searchLower) ||
      log.performer?.full_name?.toLowerCase().includes(searchLower) ||
      log.performer?.email?.toLowerCase().includes(searchLower) ||
      log.reason?.toLowerCase().includes(searchLower)
    );
  });

  const renderDiff = (before: any, after: any) => {
    if (!before && !after) return <span className="text-muted-foreground">No data</span>;

    const allKeys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {})
    ]);

    return (
      <div className="space-y-2">
        {Array.from(allKeys).map(key => {
          const beforeVal = before?.[key];
          const afterVal = after?.[key];
          const changed = JSON.stringify(beforeVal) !== JSON.stringify(afterVal);

          if (!changed && !beforeVal && !afterVal) return null;

          return (
            <div key={key} className={cn("p-2 rounded text-sm", changed ? "bg-warning/10" : "bg-muted/30")}>
              <span className="font-medium text-muted-foreground">{key}:</span>
              {changed ? (
                <div className="mt-1 space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="text-destructive text-xs">-</span>
                    <pre className="text-xs text-destructive overflow-auto">{JSON.stringify(beforeVal, null, 2)}</pre>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-success text-xs">+</span>
                    <pre className="text-xs text-success overflow-auto">{JSON.stringify(afterVal, null, 2)}</pre>
                  </div>
                </div>
              ) : (
                <pre className="text-xs mt-1 overflow-auto">{JSON.stringify(afterVal, null, 2)}</pre>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5" />
          <h3 className="font-semibold">Finance Audit Log</h3>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="w-48">
            <Label className="mb-2 block text-xs text-muted-foreground">From Date</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-input" />
          </div>
          <div className="w-48">
            <Label className="mb-2 block text-xs text-muted-foreground">To Date</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-input" />
          </div>
          <div className="w-48">
            <Label className="mb-2 block text-xs text-muted-foreground">Store</Label>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="bg-input"><SelectValue placeholder="All Stores" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Label className="mb-2 block text-xs text-muted-foreground">Action Type</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="bg-input"><SelectValue placeholder="All Actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map(a => <SelectItem key={a} value={a}>{getActionLabel(a)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className="mb-2 block text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, user, reason..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-input"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No audit logs found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getActionColor(log.action_type))}>
                        {getActionLabel(log.action_type)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.entity_type}/{log.entity_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{log.store?.name || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {log.performer?.full_name || log.performer?.email || 'System'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {log.reason || '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Timestamp</Label>
                    <p className="font-medium">{format(new Date(selectedLog.created_at), 'dd MMM yyyy HH:mm:ss')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Performed By</Label>
                    <p className="font-medium">{selectedLog.performer?.full_name || selectedLog.performer?.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Action</Label>
                    <p className={cn("inline-block px-2 py-1 rounded-full text-xs font-medium", getActionColor(selectedLog.action_type))}>
                      {getActionLabel(selectedLog.action_type)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Entity</Label>
                    <p className="font-mono text-sm">{selectedLog.entity_type} / {selectedLog.entity_id}</p>
                  </div>
                </div>

                {selectedLog.reason && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Reason</Label>
                    <p className="p-3 bg-muted/50 rounded-lg text-sm">{selectedLog.reason}</p>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Changes (Before / After)</Label>
                  {renderDiff(selectedLog.before_data, selectedLog.after_data)}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Link2, Globe, ShoppingCart, ShoppingBag, Shirt, FileSpreadsheet,
  Check, X, RefreshCw, Upload, AlertTriangle, Clock, Loader2,
  Plug, Unplug, ArrowRightLeft, Activity, Plus, Search
} from 'lucide-react';
import { channelConnectors, getConnector, parseCSVOrders } from '@/lib/channelConnectorsV2';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const ICON_MAP: Record<string, any> = { Globe, ShoppingCart, ShoppingBag, Shirt, FileSpreadsheet, Link2 };

interface ChannelAccount {
  id: string;
  channel_type: string;
  channel_name: string;
  store_id: string | null;
  is_active: boolean;
  credentials: Record<string, string>;
  settings: Record<string, any>;
  last_sync_at: string | null;
  created_at: string;
}

interface SyncLog {
  id: string;
  channel_account_id: string;
  sync_type: string;
  status: string;
  records_processed: number;
  records_failed: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

interface SkuMapping {
  id: string;
  channel_account_id: string;
  internal_product_id: string | null;
  internal_variant_id: string | null;
  internal_cigar_id: string | null;
  external_sku: string;
  external_product_id: string | null;
  external_product_name: string | null;
  is_active: boolean;
}

export default function Channels() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [accounts, setAccounts] = useState<ChannelAccount[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [skuMappings, setSkuMappings] = useState<SkuMapping[]>([]);
  const [loading, setLoading] = useState(true);

  // Connect dialog
  const [showConnect, setShowConnect] = useState(false);
  const [connectChannelId, setConnectChannelId] = useState('');
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState(false);

  // CSV Import
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvParsing, setCsvParsing] = useState(false);

  // SKU Mapping dialog
  const [showSkuDialog, setShowSkuDialog] = useState(false);
  const [skuAccountId, setSkuAccountId] = useState('');
  const [newSkuForm, setNewSkuForm] = useState({ external_sku: '', external_product_name: '', internal_cigar_id: '' });
  const [cigars, setCigars] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

  // Sync action
  const [syncing, setSyncing] = useState<string | null>(null);
  const [healthResults, setHealthResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [accRes, logRes, skuRes, cigarRes, prodRes] = await Promise.all([
      supabase.from('channel_accounts').select('*').order('created_at', { ascending: false }),
      supabase.from('channel_sync_logs').select('*').order('started_at', { ascending: false }).limit(50),
      supabase.from('sku_mappings').select('*').order('created_at', { ascending: false }),
      supabase.from('cigars').select('id, name').order('name'),
      supabase.from('products').select('id, name').order('name'),
    ]);
    setAccounts((accRes.data as unknown as ChannelAccount[]) || []);
    setSyncLogs((logRes.data as unknown as SyncLog[]) || []);
    setSkuMappings((skuRes.data as unknown as SkuMapping[]) || []);
    setCigars(cigarRes.data || []);
    setProducts(prodRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Connect channel
  const openConnect = (channelId: string) => {
    setConnectChannelId(channelId);
    setCredentialValues({});
    setShowConnect(true);
  };

  const handleConnect = async () => {
    if (!user) return;
    const connector = getConnector(connectChannelId);
    if (!connector) return;
    setConnecting(true);
    try {
      // Health check first
      const health = await connector.healthCheck(credentialValues);
      if (!health.ok && connector.credentialFields.length > 0) {
        toast.error(`Connection failed: ${health.message}`);
        setConnecting(false);
        return;
      }

      const { error } = await supabase.from('channel_accounts').insert({
        channel_type: connector.id,
        channel_name: connector.name,
        store_id: currentStore?.id || null,
        is_active: true,
        credentials: credentialValues,
        created_by: user.id,
      });
      if (error) throw error;

      // Log sync
      const { data: newAcc } = await supabase.from('channel_accounts')
        .select('id').eq('channel_type', connector.id).order('created_at', { ascending: false }).limit(1).single();
      if (newAcc) {
        await supabase.from('channel_sync_logs').insert({
          channel_account_id: newAcc.id,
          sync_type: 'health_check',
          status: 'success',
          records_processed: 0,
          completed_at: new Date().toISOString(),
        });
      }

      toast.success(`${connector.name} connected!`);
      setShowConnect(false);
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setConnecting(false);
  };

  const handleDisconnect = async (account: ChannelAccount) => {
    await supabase.from('channel_accounts').update({ is_active: false }).eq('id', account.id);
    toast.success('Channel disconnected');
    fetchAll();
  };

  // Sync Now
  const handleSyncNow = async (account: ChannelAccount) => {
    setSyncing(account.id);
    const connector = getConnector(account.channel_type);
    if (!connector) { setSyncing(null); return; }

    try {
      const orders = await connector.pullOrders(account.credentials);
      await supabase.from('channel_accounts').update({ last_sync_at: new Date().toISOString() }).eq('id', account.id);
      await supabase.from('channel_sync_logs').insert({
        channel_account_id: account.id,
        sync_type: 'pull_orders',
        status: orders.length > 0 ? 'success' : 'no_data',
        records_processed: orders.length,
        completed_at: new Date().toISOString(),
        details: { order_ids: orders.map(o => o.external_order_id) } as any,
      });
      toast.success(`Synced ${orders.length} orders from ${account.channel_name}`);
      fetchAll();
    } catch (e: any) {
      await supabase.from('channel_sync_logs').insert({
        channel_account_id: account.id,
        sync_type: 'pull_orders',
        status: 'error',
        error_message: e.message,
        completed_at: new Date().toISOString(),
      });
      toast.error(`Sync failed: ${e.message}`);
      fetchAll();
    }
    setSyncing(null);
  };

  // Health Check
  const runHealthCheck = async (account: ChannelAccount) => {
    const connector = getConnector(account.channel_type);
    if (!connector) return;
    const result = await connector.healthCheck(account.credentials);
    setHealthResults(prev => ({ ...prev, [account.id]: result }));
    await supabase.from('channel_sync_logs').insert({
      channel_account_id: account.id,
      sync_type: 'health_check',
      status: result.ok ? 'success' : 'error',
      error_message: result.ok ? null : result.message,
      completed_at: new Date().toISOString(),
    });
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  };

  // CSV Import
  const handleCsvImport = async () => {
    if (!csvText.trim()) { toast.error('Paste CSV data'); return; }
    setCsvParsing(true);
    const result = parseCSVOrders(csvText);
    if (result.errors.length > 0) {
      toast.error(`${result.errors.length} errors: ${result.errors[0]}`);
    }
    if (result.orders.length > 0) {
      // Find or create CSV account
      let csvAccount = accounts.find(a => a.channel_type === 'csv_import');
      if (!csvAccount && user) {
        const { data } = await supabase.from('channel_accounts').insert({
          channel_type: 'csv_import', channel_name: 'CSV Import', store_id: currentStore?.id || null,
          is_active: true, created_by: user.id,
        }).select().single();
        if (data) csvAccount = data as unknown as ChannelAccount;
      }
      if (csvAccount) {
        await supabase.from('channel_sync_logs').insert({
          channel_account_id: csvAccount.id,
          sync_type: 'csv_import',
          status: result.errors.length > 0 ? 'partial' : 'success',
          records_processed: result.orders.length,
          records_failed: result.errors.length,
          error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
          completed_at: new Date().toISOString(),
        });
      }
      toast.success(`Parsed ${result.orders.length} orders from CSV`);
    }
    setCsvParsing(false);
    setShowCsvImport(false);
    setCsvText('');
    fetchAll();
  };

  // SKU Mapping
  const openSkuMapping = (accountId: string) => {
    setSkuAccountId(accountId);
    setNewSkuForm({ external_sku: '', external_product_name: '', internal_cigar_id: '' });
    setShowSkuDialog(true);
  };

  const addSkuMapping = async () => {
    if (!newSkuForm.external_sku.trim()) { toast.error('External SKU required'); return; }
    const { error } = await supabase.from('sku_mappings').insert({
      channel_account_id: skuAccountId,
      external_sku: newSkuForm.external_sku,
      external_product_name: newSkuForm.external_product_name || null,
      internal_cigar_id: newSkuForm.internal_cigar_id || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('SKU mapping added');
    setNewSkuForm({ external_sku: '', external_product_name: '', internal_cigar_id: '' });
    fetchAll();
  };

  const deleteSkuMapping = async (id: string) => {
    await supabase.from('sku_mappings').delete().eq('id', id);
    toast.success('Mapping removed');
    fetchAll();
  };

  const connectedTypes = accounts.filter(a => a.is_active).map(a => a.channel_type);
  const accountLogs = (accountId: string) => syncLogs.filter(l => l.channel_account_id === accountId);
  const accountMappings = (accountId: string) => skuMappings.filter(m => m.channel_account_id === accountId);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-display">Channels & Integrations</h1>
            <p className="text-muted-foreground text-sm mt-1">Connect marketplaces, sync orders, and manage SKU mappings</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCsvImport(true)}>
              <Upload className="w-4 h-4 mr-2" /> CSV Import
            </Button>
          </div>
        </div>

        <Tabs defaultValue="channels">
          <TabsList>
            <TabsTrigger value="channels"><Plug className="w-3 h-3 mr-1" /> Channels</TabsTrigger>
            <TabsTrigger value="sku"><ArrowRightLeft className="w-3 h-3 mr-1" /> SKU Mappings</TabsTrigger>
            <TabsTrigger value="health"><Activity className="w-3 h-3 mr-1" /> Sync Health</TabsTrigger>
          </TabsList>

          {/* Channels Tab */}
          <TabsContent value="channels" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {channelConnectors.map(connector => {
                const Icon = ICON_MAP[connector.icon] || Link2;
                const account = accounts.find(a => a.channel_type === connector.id && a.is_active);
                const isConnected = !!account;
                const lastSync = account?.last_sync_at;

                return (
                  <Card key={connector.id} className={cn('transition-all', isConnected && 'ring-1 ring-primary/20')}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={cn('inline-flex items-center justify-center w-10 h-10 rounded-lg', connector.color)}>
                            <Icon className="w-5 h-5" />
                          </span>
                          <div>
                            <CardTitle className="text-base">{connector.name}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {isConnected ? (
                                <span className="flex items-center gap-1 text-emerald-600"><Check className="w-3 h-3" /> Connected</span>
                              ) : 'Not connected'}
                            </p>
                          </div>
                        </div>
                        {isConnected && (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600">Active</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{connector.description}</p>
                      {lastSync && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Last sync: {format(new Date(lastSync), 'dd MMM HH:mm')}
                        </p>
                      )}
                      <div className="flex gap-2">
                        {isConnected ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleSyncNow(account)} disabled={syncing === account.id}>
                              {syncing === account.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                              Sync
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openSkuMapping(account.id)}>
                              <ArrowRightLeft className="w-3 h-3 mr-1" /> SKUs
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDisconnect(account)}>
                              <Unplug className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" onClick={() => connector.id === 'csv_import' ? setShowCsvImport(true) : openConnect(connector.id)}>
                            <Plug className="w-3 h-3 mr-1" /> Connect
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* SKU Mappings Tab */}
          <TabsContent value="sku" className="space-y-4">
            {accounts.filter(a => a.is_active).length === 0 ? (
              <div className="glass-card p-12 text-center">
                <ArrowRightLeft className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="font-medium">No channels connected</p>
                <p className="text-sm text-muted-foreground mt-1">Connect a channel first to manage SKU mappings</p>
              </div>
            ) : (
              accounts.filter(a => a.is_active).map(account => {
                const mappings = accountMappings(account.id);
                return (
                  <div key={account.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{account.channel_name}</h3>
                      <Button size="sm" variant="outline" onClick={() => openSkuMapping(account.id)}>
                        <Plus className="w-3 h-3 mr-1" /> Add Mapping
                      </Button>
                    </div>
                    <div className="glass-card overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>External SKU</TableHead>
                            <TableHead>External Product</TableHead>
                            <TableHead>Internal Product</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mappings.map(m => (
                            <TableRow key={m.id}>
                              <TableCell className="font-mono text-sm">{m.external_sku}</TableCell>
                              <TableCell className="text-sm">{m.external_product_name || '-'}</TableCell>
                              <TableCell className="text-sm">
                                {m.internal_cigar_id ? cigars.find(c => c.id === m.internal_cigar_id)?.name || 'Unknown' :
                                 m.internal_product_id ? products.find(p => p.id === m.internal_product_id)?.name || 'Unknown' :
                                 <span className="text-destructive text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Unmapped</span>}
                              </TableCell>
                              <TableCell>
                                <Badge variant={m.is_active ? 'secondary' : 'outline'} className="text-[10px]">
                                  {m.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" onClick={() => deleteSkuMapping(m.id)}><X className="w-3 h-3" /></Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {mappings.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">No SKU mappings yet</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Sync Health Tab */}
          <TabsContent value="health" className="space-y-4">
            {/* Health status cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.filter(a => a.is_active).map(account => {
                const logs = accountLogs(account.id);
                const lastLog = logs[0];
                const health = healthResults[account.id];
                const errorCount = logs.filter(l => l.status === 'error').length;
                const connector = getConnector(account.channel_type);

                return (
                  <Card key={account.id}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{account.channel_name}</h4>
                        <Badge variant={errorCount > 0 ? 'destructive' : 'secondary'} className="text-[10px]">
                          {errorCount > 0 ? `${errorCount} errors` : 'Healthy'}
                        </Badge>
                      </div>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <p>Last sync: {account.last_sync_at ? format(new Date(account.last_sync_at), 'dd MMM HH:mm') : 'Never'}</p>
                        {lastLog && <p>Last action: {lastLog.sync_type} — {lastLog.status}</p>}
                        {health && <p className={health.ok ? 'text-emerald-600' : 'text-destructive'}>{health.message}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => runHealthCheck(account)}>
                          <Activity className="w-3 h-3 mr-1" /> Check
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleSyncNow(account)} disabled={syncing === account.id}>
                          {syncing === account.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                          Sync Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Sync logs table */}
            <div>
              <h3 className="font-medium mb-2">Sync Logs</h3>
              <div className="glass-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead>Failed</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.slice(0, 20).map(log => {
                      const account = accounts.find(a => a.id === log.channel_account_id);
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-muted-foreground">{format(new Date(log.started_at), 'dd MMM HH:mm')}</TableCell>
                          <TableCell className="text-sm">{account?.channel_name || 'Unknown'}</TableCell>
                          <TableCell className="text-sm capitalize">{log.sync_type.replace('_', ' ')}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === 'success' ? 'secondary' : log.status === 'error' ? 'destructive' : 'outline'} className="text-[10px]">
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.records_processed}</TableCell>
                          <TableCell className="text-sm">{log.records_failed > 0 ? <span className="text-destructive">{log.records_failed}</span> : '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.error_message || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                    {syncLogs.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No sync logs yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Connect Channel Dialog */}
      <Dialog open={showConnect} onOpenChange={setShowConnect}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plug className="w-5 h-5" /> Connect {getConnector(connectChannelId)?.name}</DialogTitle>
            <DialogDescription>Enter your API credentials to connect this channel. Credentials are stored securely.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {getConnector(connectChannelId)?.credentialFields.map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label>{field.label}</Label>
                <Input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={credentialValues[field.key] || ''}
                  onChange={e => setCredentialValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            ))}
            {getConnector(connectChannelId)?.credentialFields.length === 0 && (
              <p className="text-sm text-muted-foreground">No credentials required for this channel.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnect(false)}>Cancel</Button>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Connect & Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={showCsvImport} onOpenChange={setShowCsvImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" /> CSV Order Import</DialogTitle>
            <DialogDescription>Paste CSV data with columns: customer_name, product_name, quantity, unit_price. Optional: order_number, customer_phone, shipping_address, sku, total.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>CSV Data</Label>
              <Textarea
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder={`customer_name,product_name,quantity,unit_price,customer_phone\nJohn Doe,Cohiba Behike 56,2,8500,+91 98765 43210`}
                rows={10}
                className="font-mono text-xs"
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Required columns:</p>
              <p>customer_name, product_name, quantity, unit_price</p>
              <p className="font-medium mt-2">Optional columns:</p>
              <p>order_number, external_order_id, customer_phone, customer_email, shipping_address, sku, variant_info, total, notes, order_date</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCsvImport(false)}>Cancel</Button>
            <Button onClick={handleCsvImport} disabled={csvParsing || !csvText.trim()}>
              {csvParsing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Parse & Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SKU Mapping Dialog */}
      <Dialog open={showSkuDialog} onOpenChange={setShowSkuDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" /> SKU Mappings</DialogTitle>
            <DialogDescription>Map external channel SKUs to your internal products</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Existing mappings */}
            <div className="max-h-40 overflow-y-auto space-y-2">
              {accountMappings(skuAccountId).map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                  <div>
                    <span className="font-mono">{m.external_sku}</span>
                    <span className="text-muted-foreground mx-2">→</span>
                    <span>{m.internal_cigar_id ? cigars.find(c => c.id === m.internal_cigar_id)?.name : 'Unmapped'}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteSkuMapping(m.id)}><X className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
            {/* Add new */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Add New Mapping</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>External SKU</Label>
                  <Input value={newSkuForm.external_sku} onChange={e => setNewSkuForm(p => ({ ...p, external_sku: e.target.value }))} placeholder="AMZN-SKU-001" />
                </div>
                <div>
                  <Label>External Product Name</Label>
                  <Input value={newSkuForm.external_product_name} onChange={e => setNewSkuForm(p => ({ ...p, external_product_name: e.target.value }))} placeholder="Product name on channel" />
                </div>
              </div>
              <div>
                <Label>Map to Internal Product</Label>
                <Select value={newSkuForm.internal_cigar_id} onValueChange={v => setNewSkuForm(p => ({ ...p, internal_cigar_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select product..." /></SelectTrigger>
                  <SelectContent>
                    {cigars.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (Product)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addSkuMapping} disabled={!newSkuForm.external_sku.trim()} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Mapping
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

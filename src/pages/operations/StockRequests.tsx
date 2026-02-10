import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardList, Check, X, Clock, Truck, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StockRequest {
  id: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  notes: string | null;
  created_at: string;
  store: { name: string };
  cigar: { name: string };
  requester: { full_name: string; email: string };
}

export default function StockRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    // First fetch stock requests with store and cigar info
    const { data: requestsData } = await supabase
      .from('stock_requests')
      .select(`
        *,
        store:stores(name),
        cigar:cigars(name)
      `)
      .order('created_at', { ascending: false });

    // Then fetch profile info separately
    const requests = requestsData || [];
    const userIds = [...new Set(requests.map(r => r.requested_by))];
    
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);
    
    const profileMap = new Map((profilesData || []).map(p => [p.id, p]));
    
    const enrichedRequests = requests.map(r => ({
      ...r,
      requester: profileMap.get(r.requested_by) || { full_name: null, email: 'Unknown' }
    }));

    setRequests(enrichedRequests as unknown as StockRequest[]);
    setLoading(false);
  };

  const updateRequest = async (id: string, status: 'approved' | 'rejected' | 'fulfilled') => {
    // Get request details for inventory update
    const request = requests.find(r => r.id === id);
    
    if (status === 'fulfilled' && request) {
      // Get the full request data with cigar_id and store_id
      const { data: fullRequest } = await supabase
        .from('stock_requests')
        .select('cigar_id, store_id, quantity')
        .eq('id', id)
        .single();
      
      if (fullRequest) {
        // 1. Decrement HQ stock (cigars table)
        const { data: cigar } = await supabase
          .from('cigars')
          .select('stock_quantity')
          .eq('id', fullRequest.cigar_id)
          .single();
        
        if (cigar) {
          const newHqStock = Math.max(0, (cigar.stock_quantity || 0) - fullRequest.quantity);
          await supabase
            .from('cigars')
            .update({ stock_quantity: newHqStock })
            .eq('id', fullRequest.cigar_id);
        }
        
        // 2. Increment store inventory
        const { data: existingInventory } = await supabase
          .from('store_inventory')
          .select('id, quantity')
          .eq('store_id', fullRequest.store_id)
          .eq('cigar_id', fullRequest.cigar_id)
          .single();
        
        if (existingInventory) {
          // Update existing inventory
          await supabase
            .from('store_inventory')
            .update({ quantity: existingInventory.quantity + fullRequest.quantity })
            .eq('id', existingInventory.id);
        } else {
          // Create new inventory entry
          await supabase
            .from('store_inventory')
            .insert({
              store_id: fullRequest.store_id,
              cigar_id: fullRequest.cigar_id,
              quantity: fullRequest.quantity
            });
        }
      }
    }

    const { error } = await supabase
      .from('stock_requests')
      .update({
        status,
        approved_by: user?.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update request');
    } else {
      toast.success(`Request ${status}`);
      fetchRequests();
    }
  };

  const statusConfig: Record<string, { class: string; icon: React.ReactNode; label: string }> = {
    pending: { class: 'bg-yellow-500/20 text-yellow-600', icon: <Clock className="w-3 h-3" />, label: 'Pending' },
    approved: { class: 'bg-blue-500/20 text-blue-600', icon: <Truck className="w-3 h-3" />, label: 'Approved' },
    rejected: { class: 'bg-red-500/20 text-red-600', icon: <X className="w-3 h-3" />, label: 'Rejected' },
    fulfilled: { class: 'bg-green-500/20 text-green-600', icon: <CheckCircle className="w-3 h-3" />, label: 'Fulfilled' }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Stock Requests</h2>
        <p className="text-muted-foreground text-sm mt-1">Review and process stock requests from sales team</p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No stock requests</p>
                </TableCell>
              </TableRow>
            ) : (
              requests.map(request => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.store?.name || 'N/A'}</TableCell>
                  <TableCell>{request.cigar?.name || 'N/A'}</TableCell>
                  <TableCell className="font-semibold">{request.quantity}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {request.requester?.full_name || request.requester?.email || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(request.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                      statusConfig[request.status].class
                    )}>
                      {statusConfig[request.status].icon}
                      {statusConfig[request.status].label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {request.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-500/50 hover:bg-green-500/10"
                          onClick={() => updateRequest(request.id, 'approved')}
                        >
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-500/50 hover:bg-red-500/10"
                          onClick={() => updateRequest(request.id, 'rejected')}
                        >
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                    {request.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-500/50 hover:bg-blue-500/10"
                        onClick={() => updateRequest(request.id, 'fulfilled')}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Mark Fulfilled
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

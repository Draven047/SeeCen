import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, RefreshCw, Download, Eye, Edit, Trash2, Phone, Mail, Filter, Gift, Upload, FileText, MapPin, Calendar, ShoppingBag, Ban, CheckSquare, Square, AlertTriangle, MessageCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  date_of_birth: string | null;
  last_order_date: string | null;
  store_id: string | null;
  fume_points_balance: number;
  created_at: string;
  is_blacklisted: boolean;
}

interface CustomerWithStats extends Customer {
  orderCount: number;
  totalSpent: number;
  status: 'vip' | 'regular' | 'new' | 'at_risk' | 'inactive';
  storeName: string | null;
}

interface OrderWithItems {
  id: string;
  order_number: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  fume_points_earned: number;
  fume_points_redeemed: number;
  created_at: string;
  notes: string | null;
  items: {
    id: string;
    cigar_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

interface CsvPreviewData {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  date_of_birth: string | null;
  notes: string | null;
  fume_points_balance: number;
  orderCount: number;
  totalSpent: number;
  existingPhone: boolean;
}

export default function Customers() {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === 'admin';
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithStats | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<CustomerWithStats | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<OrderWithItems[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    address: '', 
    notes: '',
    date_of_birth: ''
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // CSV Preview state
  const [csvPreviewOpen, setCsvPreviewOpen] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState<CsvPreviewData[]>([]);
  
  // Admin selection state
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update'>('skip');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    
    // Fetch all customers (RLS allows viewing for lookups)
    const { data: customersData } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    
    // For sales users, fetch only orders they created to determine which customers to show
    // For admin/operations, fetch all orders
    const isSales = role === 'sales';
    let ordersQuery = supabase.from('orders').select('customer_id, total, created_by, created_at');
    
    const { data: ordersData } = await ordersQuery;
    
    const { data: storesData } = await supabase
      .from('stores')
      .select('id, name');
    
    const storeMap = new Map(storesData?.map(s => [s.id, s.name]) || []);
    
    // Build set of customer IDs that this sales user has orders for
    const myCustomerIds = new Set<string>();
    const customerStats = new Map<string, { count: number; total: number; lastOrderAt: number }>();
    
    ordersData?.forEach(order => {
      if (order.customer_id) {
        // Track if this user created an order for this customer
        if (order.created_by === user?.id) {
          myCustomerIds.add(order.customer_id);
        }
        
        const existing = customerStats.get(order.customer_id) || { count: 0, total: 0, lastOrderAt: 0 };
        customerStats.set(order.customer_id, {
          count: existing.count + 1,
          total: existing.total + Number(order.total),
          lastOrderAt: Math.max(existing.lastOrderAt, new Date(order.created_at || 0).getTime())
        });
      }
    });
    
    // Filter customers based on role
    let filteredCustomers = customersData || [];
    if (isSales) {
      // Sales users only see customers they have created orders for
      // OR customers they created (created_by)
      filteredCustomers = filteredCustomers.filter(c => 
        myCustomerIds.has(c.id) || c.created_by === user?.id
      );
    }
    
    const enrichedCustomers: CustomerWithStats[] = filteredCustomers.map(customer => {
      const stats = customerStats.get(customer.id) || { count: 0, total: 0, lastOrderAt: 0 };
      const importedOrderCount = (customer as any).imported_order_count || 0;
      const importedTotalSpent = Number((customer as any).imported_total_spent) || 0;

      const totalOrderCount = stats.count + importedOrderCount;
      const totalSpent = stats.total + importedTotalSpent;

      const daysSinceCreation = Math.floor((Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceLastOrder = stats.lastOrderAt > 0
        ? Math.floor((Date.now() - stats.lastOrderAt) / (1000 * 60 * 60 * 24))
        : null;

      let status: 'vip' | 'regular' | 'new' | 'at_risk' | 'inactive' = 'regular';
      if (totalSpent >= 100000) status = 'vip';
      else if (daysSinceCreation < 30) status = 'new';
      else if (totalOrderCount === 0 && daysSinceCreation > 60) status = 'inactive';
      else if (daysSinceLastOrder != null && daysSinceLastOrder > 45) status = 'at_risk';

      return {
        ...customer,
        last_order_date: customer.last_order_date || (stats.lastOrderAt > 0 ? new Date(stats.lastOrderAt).toISOString() : null),
        orderCount: totalOrderCount,
        totalSpent: totalSpent,
        status,
        storeName: customer.store_id ? storeMap.get(customer.store_id) || null : null,
        is_blacklisted: customer.is_blacklisted ?? false
      };
    });
    
    setCustomers(enrichedCustomers);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCustomer) {
      const { error } = await supabase.from('customers').update({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        notes: form.notes || null,
        date_of_birth: form.date_of_birth || null
      }).eq('id', editingCustomer.id);
      
      if (error) {
        toast.error('Failed to update customer');
      } else {
        toast.success('Customer updated!');
        resetForm();
        fetchCustomers();
      }
    } else {
      const { error } = await supabase.from('customers').insert({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        notes: form.notes || null,
        date_of_birth: form.date_of_birth || null,
        created_by: user?.id
      });
      
      if (error) {
        toast.error('Failed to add customer');
      } else {
        toast.success('Customer added!');
        resetForm();
        fetchCustomers();
      }
    }
  };

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', address: '', notes: '', date_of_birth: '' });
    setEditingCustomer(null);
    setDialogOpen(false);
  };

  const openEditDialog = (customer: CustomerWithStats) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || '',
      date_of_birth: customer.date_of_birth || ''
    });
    setDialogOpen(true);
  };

  const openViewDialog = async (customer: CustomerWithStats) => {
    setViewingCustomer(customer);
    setViewDialogOpen(true);
    setLoadingOrders(true);
    setCustomerOrders([]);
    
    // Fetch customer orders with items
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, order_number, status, total, subtotal, tax, fume_points_earned, fume_points_redeemed, created_at, notes')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });
    
    if (ordersData && ordersData.length > 0) {
      const ordersWithItems: OrderWithItems[] = [];
      
      for (const order of ordersData) {
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('id, quantity, unit_price, total_price, cigar_id')
          .eq('order_id', order.id);
        
        const items = [];
        if (itemsData) {
          for (const item of itemsData) {
            const { data: cigar } = await supabase
              .from('cigars')
              .select('name')
              .eq('id', item.cigar_id)
              .maybeSingle();
            
            items.push({
              id: item.id,
              cigar_name: cigar?.name || 'Unknown Cigar',
              quantity: item.quantity,
              unit_price: Number(item.unit_price),
              total_price: Number(item.total_price)
            });
          }
        }
        
        ordersWithItems.push({
          ...order,
          total: Number(order.total),
          subtotal: Number(order.subtotal),
          tax: Number(order.tax),
          items
        });
      }
      
      setCustomerOrders(ordersWithItems);
    }
    
    setLoadingOrders(false);
  };

  const deleteCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete customer');
    } else {
      toast.success('Customer deleted');
      setSelectedCustomers(prev => { prev.delete(id); return new Set(prev); });
      fetchCustomers();
    }
  };

  // Admin: Delete selected customers
  const deleteSelectedCustomers = async () => {
    if (selectedCustomers.size === 0) {
      toast.error('No customers selected');
      return;
    }
    if (!confirm(`Are you sure you want to delete ${selectedCustomers.size} customer(s)?`)) return;
    
    const { error } = await supabase.from('customers').delete().in('id', Array.from(selectedCustomers));
    if (error) {
      toast.error('Failed to delete customers');
    } else {
      toast.success(`${selectedCustomers.size} customer(s) deleted`);
      setSelectedCustomers(new Set());
      setSelectAll(false);
      fetchCustomers();
    }
  };

  // Admin: Delete all customers
  const deleteAllCustomers = async () => {
    if (!confirm('⚠️ Are you sure you want to delete ALL customers? This action cannot be undone!')) return;
    if (!confirm('This will permanently delete all customer records. Type "delete" to confirm.')) return;
    
    const { error } = await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      toast.error('Failed to delete customers');
    } else {
      toast.success('All customers deleted');
      setSelectedCustomers(new Set());
      setSelectAll(false);
      fetchCustomers();
    }
  };

  // Admin: Blacklist/unblacklist customer
  const toggleBlacklist = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('customers').update({ is_blacklisted: !currentStatus }).eq('id', id);
    if (error) {
      toast.error('Failed to update blacklist status');
    } else {
      toast.success(currentStatus ? 'Customer removed from blacklist' : 'Customer blacklisted');
      fetchCustomers();
    }
  };

  // Toggle selection for a customer
  const toggleCustomerSelection = (id: string) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Toggle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filtered.map(c => c.id)));
    }
    setSelectAll(!selectAll);
  };

  const exportCustomers = () => {
    const csvContent = [
      ['Name', 'Phone', 'Email', 'Address', 'Status', 'Orders', 'Fume Points', 'Total Spent', 'Date of Birth', 'Last Order', 'Notes', 'Member Since'].join(','),
      ...filtered.map(c => [
        c.name,
        c.phone || '',
        c.email || '',
        c.address || '',
        c.status,
        c.orderCount,
        c.fume_points_balance,
        c.totalSpent,
        c.date_of_birth || '',
        c.last_order_date || '',
        c.notes || '',
        c.created_at
      ].map(v => `"${v}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers_export.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Customers exported!');
  };

  const exportSingleCustomer = (customer: CustomerWithStats) => {
    const csvContent = [
      ['Field', 'Value'].join(','),
      ['Name', customer.name].map(v => `"${v}"`).join(','),
      ['Phone', customer.phone || ''].map(v => `"${v}"`).join(','),
      ['Email', customer.email || ''].map(v => `"${v}"`).join(','),
      ['Address', customer.address || ''].map(v => `"${v}"`).join(','),
      ['Status', customer.status].map(v => `"${v}"`).join(','),
      ['Orders', String(customer.orderCount)].map(v => `"${v}"`).join(','),
      ['Fume Points', String(customer.fume_points_balance)].map(v => `"${v}"`).join(','),
      ['Total Spent', String(customer.totalSpent)].map(v => `"${v}"`).join(','),
      ['Date of Birth', customer.date_of_birth || ''].map(v => `"${v}"`).join(','),
      ['Last Order', customer.last_order_date || ''].map(v => `"${v}"`).join(','),
      ['Notes', customer.notes || ''].map(v => `"${v}"`).join(','),
      ['Member Since', customer.created_at].map(v => `"${v}"`).join(','),
      '',
      ['Order History'].join(','),
      ['Order Number', 'Date', 'Status', 'Total', 'Items'].join(','),
      ...customerOrders.map(o => [
        o.order_number,
        o.created_at,
        o.status,
        o.total,
        o.items.map(i => `${i.cigar_name} x${i.quantity}`).join('; ')
      ].map(v => `"${v}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_${customer.name.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Customer data exported!');
  };

  const downloadTemplate = () => {
    const headers = ['Name', 'Phone', 'Email', 'Address', 'Status', 'Orders', 'Fume points', 'Total Spent', 'Date of birth'];
    const sampleRow = ['John Doe', '9876543210', 'john@example.com', '123 Main St City', 'Active', '5', '250', '12500', '1990-05-15'];
    const note = '# Note: Status, Orders, Fume Points, Total Spent columns are for your reference - only Name, Phone, Email, Address, and Date of birth are imported';
    const csvContent = [note, headers.join(','), sampleRow.join(',')].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded!');
  };

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      if (lines.length < 2) {
        toast.error('CSV file must have a header row and at least one data row');
        setUploading(false);
        return;
      }

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/^"|"$/g, ''));
      const nameIndex = headers.indexOf('name');
      const phoneIndex = headers.indexOf('phone');
      const emailIndex = headers.indexOf('email');
      const addressIndex = headers.indexOf('address');
      const dobIndex = headers.findIndex(h => h === 'date of birth' || h === 'date_of_birth' || h === 'dob');
      const notesIndex = headers.indexOf('notes');
      const fumePointsIndex = headers.findIndex(h => h === 'fume points' || h === 'fume_points');
      const ordersIndex = headers.indexOf('orders');
      const totalSpentIndex = headers.findIndex(h => h === 'total spent' || h === 'total_spent' || h === 'totalspent');

      if (nameIndex === -1) {
        toast.error('CSV must have a "name" column');
        setUploading(false);
        return;
      }

      // Group rows by customer name to merge duplicates
      const customerMap = new Map<string, {
        name: string;
        phone: string | null;
        email: string | null;
        address: string | null;
        date_of_birth: string | null;
        notes: string | null;
        fume_points_balance: number;
        orderCount: number;
        totalSpent: number;
      }>();

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, ''));
        const name = values[nameIndex]?.trim();
        
        if (!name) continue;

        const existingCustomer = customerMap.get(name.toLowerCase());
        
        if (existingCustomer) {
          if (fumePointsIndex !== -1 && values[fumePointsIndex]) {
            existingCustomer.fume_points_balance += parseInt(values[fumePointsIndex]) || 0;
          }
          if (ordersIndex !== -1 && values[ordersIndex]) {
            existingCustomer.orderCount += parseInt(values[ordersIndex]) || 0;
          }
          if (totalSpentIndex !== -1 && values[totalSpentIndex]) {
            existingCustomer.totalSpent += parseFloat(values[totalSpentIndex].replace(/[^0-9.-]/g, '')) || 0;
          }
          if (notesIndex !== -1 && values[notesIndex]) {
            existingCustomer.notes = existingCustomer.notes 
              ? `${existingCustomer.notes}; ${values[notesIndex]}` 
              : values[notesIndex];
          }
        } else {
          let dob: string | null = null;
          if (dobIndex !== -1 && values[dobIndex]) {
            const dobValue = values[dobIndex];
            if (dobValue && dobValue !== '') {
              dob = dobValue;
            }
          }

          customerMap.set(name.toLowerCase(), {
            name,
            phone: phoneIndex !== -1 ? values[phoneIndex] || null : null,
            email: emailIndex !== -1 ? values[emailIndex] || null : null,
            address: addressIndex !== -1 ? values[addressIndex] || null : null,
            date_of_birth: dob,
            notes: notesIndex !== -1 ? values[notesIndex] || null : null,
            fume_points_balance: fumePointsIndex !== -1 ? (parseInt(values[fumePointsIndex]) || 0) : 0,
            orderCount: ordersIndex !== -1 ? (parseInt(values[ordersIndex]) || 0) : 0,
            totalSpent: totalSpentIndex !== -1 ? (parseFloat(values[totalSpentIndex].replace(/[^0-9.-]/g, '')) || 0) : 0,
          });
        }
      }

      const customersToPreview = Array.from(customerMap.values());

      if (customersToPreview.length === 0) {
        toast.error('No valid customer data found in CSV');
        setUploading(false);
        return;
      }

      // Check for existing phone numbers
      const phonesToCheck = customersToPreview.filter(c => c.phone).map(c => c.phone!);
      const { data: existingCustomers } = await supabase
        .from('customers')
        .select('phone')
        .in('phone', phonesToCheck);
      
      const existingPhones = new Set((existingCustomers || []).map(c => c.phone));

      const previewData: CsvPreviewData[] = customersToPreview.map(c => ({
        ...c,
        existingPhone: c.phone ? existingPhones.has(c.phone) : false
      }));

      setCsvPreviewData(previewData);
      setCsvPreviewOpen(true);
    } catch (err) {
      toast.error('Failed to parse CSV file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const confirmCsvImport = async () => {
    setUploading(true);
    
    const toInsert: typeof csvPreviewData = [];
    const toUpdate: typeof csvPreviewData = [];
    
    csvPreviewData.forEach(c => {
      if (c.existingPhone) {
        if (duplicateAction === 'update') {
          toUpdate.push(c);
        }
        // Skip if action is 'skip'
      } else {
        toInsert.push(c);
      }
    });

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = csvPreviewData.filter(c => c.existingPhone && duplicateAction === 'skip').length;

    // Insert new customers
    if (toInsert.length > 0) {
      const { error } = await supabase.from('customers').insert(
        toInsert.map(c => ({
          name: c.name,
          phone: c.phone,
          email: c.email,
          address: c.address,
          date_of_birth: c.date_of_birth,
          notes: c.notes,
          fume_points_balance: c.fume_points_balance,
          imported_order_count: c.orderCount,
          imported_total_spent: c.totalSpent,
          created_by: user?.id
        }))
      );
      
      if (error) {
        toast.error('Failed to import customers: ' + error.message);
        setUploading(false);
        return;
      }
      insertedCount = toInsert.length;
    }

    // Update existing customers
    for (const c of toUpdate) {
      if (!c.phone) continue;
      const { error } = await supabase
        .from('customers')
        .update({
          name: c.name,
          email: c.email,
          address: c.address,
          date_of_birth: c.date_of_birth,
          notes: c.notes,
          imported_order_count: c.orderCount,
          imported_total_spent: c.totalSpent,
        })
        .eq('phone', c.phone);
      
      if (!error) updatedCount++;
    }

    const messages = [];
    if (insertedCount > 0) messages.push(`${insertedCount} imported`);
    if (updatedCount > 0) messages.push(`${updatedCount} updated`);
    if (skippedCount > 0) messages.push(`${skippedCount} skipped`);
    
    toast.success(`Customers: ${messages.join(', ')}`);
    setCsvPreviewOpen(false);
    setCsvPreviewData([]);
    setUploading(false);
    fetchCustomers();
  };

  const filtered = customers.filter(c => {
    const matchSearch = 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Birthday reminder - customers with birthday in next 7 days
  const upcomingBirthdays = customers.filter(c => {
    if (!c.date_of_birth) return false;
    const today = new Date();
    const dob = new Date(c.date_of_birth);
    const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    const diffDays = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  const stats = {
    total: customers.length,
    vip: customers.filter(c => c.status === 'vip').length,
    regular: customers.filter(c => c.status === 'regular').length,
    new: customers.filter(c => c.status === 'new').length,
    atRisk: customers.filter(c => c.status === 'at_risk').length,
    inactive: customers.filter(c => c.status === 'inactive').length,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const statusStyles = {
    vip: 'status-vip',
    regular: 'status-regular',
    new: 'status-new',
    at_risk: 'status-at-risk',
    inactive: 'status-inactive'
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display">{t('Customer Management')}</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your customer relationships and data</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchCustomers} className="btn-outline-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={downloadTemplate} className="btn-outline-primary">
              <FileText className="w-4 h-4 mr-2" />
              Template
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                ref={fileInputRef}
                className="hidden"
                id="csv-upload"
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-outline-primary"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Importing...' : 'Upload CSV'}
              </Button>
            </div>
            <Button variant="outline" onClick={exportCustomers} className="btn-outline-primary">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true); }}>
              <DialogTrigger asChild>
                <Button className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card">
                <DialogHeader>
                  <DialogTitle>
                    {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="bg-input" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-input" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="bg-input" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} className="bg-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="bg-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="bg-input" />
                  </div>
                  <Button type="submit" className="w-full btn-primary">
                    {editingCustomer ? 'Update Customer' : 'Add Customer'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Birthday Reminders */}
        {upcomingBirthdays.length > 0 && (
          <div className="glass-card p-4 border-l-4 border-l-primary">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Upcoming Birthdays</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {upcomingBirthdays.map(c => (
                <span key={c.id} className="px-3 py-1 bg-primary/10 rounded-full text-sm">
                  {c.name} - {formatDate(c.date_of_birth!)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="stat-card-highlight text-center">
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
            <p className="text-sm text-muted-foreground">{t('Total Customers')}</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-3xl font-bold text-primary">{stats.vip}</p>
            <p className="text-sm text-muted-foreground">{t('VIP Customers')}</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-3xl font-bold text-success">{stats.regular}</p>
            <p className="text-sm text-muted-foreground">{t('Regular')}</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-3xl font-bold text-info">{stats.new}</p>
            <p className="text-sm text-muted-foreground">{t('New')}</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-3xl font-bold text-warning">{stats.atRisk}</p>
            <p className="text-sm text-muted-foreground">{t('At Risk')}</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-3xl font-bold text-muted-foreground">{stats.inactive}</p>
            <p className="text-sm text-muted-foreground">{t('Inactive')}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">Search & Filter</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Search Customers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or mobile..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Admin Bulk Actions */}
        {isAdmin && (
          <div className="glass-card p-4 border-l-4 border-l-destructive">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <span className="font-semibold text-destructive">Admin Actions</span>
                {selectedCustomers.size > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({selectedCustomers.size} selected)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={deleteSelectedCustomers}
                  disabled={selectedCustomers.size === 0}
                  className="text-destructive border-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={deleteAllCustomers}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Customers Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">Customers ({filtered.length})</h3>
            {isAdmin && filtered.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSelectAll}
                className="text-sm"
              >
                {selectAll ? (
                  <><CheckSquare className="w-4 h-4 mr-2" /> Deselect All</>
                ) : (
                  <><Square className="w-4 h-4 mr-2" /> Select All</>
                )}
              </Button>
            )}
          </div>
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No customers found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    {isAdmin && (
                      <th className="text-center p-4 text-sm font-medium text-muted-foreground w-12">
                        <Checkbox 
                          checked={selectAll}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                    )}
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Contact</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Orders</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Total Spent</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Fume Points</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last Order</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(customer => (
                    <tr key={customer.id} className={cn(
                      "table-row-hover border-t border-border",
                      customer.is_blacklisted && "bg-destructive/5",
                      selectedCustomers.has(customer.id) && "bg-primary/5"
                    )}>
                      {isAdmin && (
                        <td className="p-4 text-center">
                          <Checkbox 
                            checked={selectedCustomers.has(customer.id)}
                            onCheckedChange={() => toggleCustomerSelection(customer.id)}
                          />
                        </td>
                      )}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{customer.name}</p>
                              {customer.is_blacklisted && (
                                <span className="px-1.5 py-0.5 text-xs rounded bg-destructive/20 text-destructive flex items-center gap-1">
                                  <Ban className="w-3 h-3" /> Blacklisted
                                </span>
                              )}
                            </div>
                            {customer.storeName && (
                              <p className="text-xs text-muted-foreground">{customer.storeName}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn('status-badge capitalize', statusStyles[customer.status])}>
                          {customer.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-medium">{customer.orderCount}</span>
                        <span className="text-xs text-muted-foreground block">orders</span>
                      </td>
                      <td className="p-4 text-right font-medium">
                        {formatCurrency(customer.totalSpent)}
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-medium text-primary">{customer.fume_points_balance}</span>
                        <span className="text-xs text-muted-foreground block">points</span>
                      </td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {customer.last_order_date ? formatDate(customer.last_order_date) : '-'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          {customer.phone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[#25D366] hover:text-[#1da851]"
                              title="Follow up on WhatsApp"
                              onClick={() => {
                                const digits = customer.phone!.replace(/\D/g, '');
                                const firstName = (customer.name || '').split(' ')[0];
                                const message =
                                  customer.status === 'at_risk' || customer.status === 'inactive'
                                    ? `Hi ${firstName}! It's been a while since your last order with us. We have some new arrivals we think you'll love — can I share a few picks?`
                                    : `Hi ${firstName}! Thank you for shopping with us. Let me know if I can help you with anything.`;
                                window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
                              }}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/customers/${customer.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => openEditDialog(customer)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={cn(
                                "h-8 w-8",
                                customer.is_blacklisted ? "text-warning hover:text-warning" : "text-muted-foreground hover:text-foreground"
                              )}
                              onClick={() => toggleBlacklist(customer.id, customer.is_blacklisted)}
                              title={customer.is_blacklisted ? "Remove from blacklist" : "Blacklist customer"}
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteCustomer(customer.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* View Customer Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="glass-card max-w-lg max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Customer Details</DialogTitle>
            </DialogHeader>
            {viewingCustomer && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-foreground">
                      {viewingCustomer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{viewingCustomer.name}</h3>
                    <span className={cn('status-badge capitalize', statusStyles[viewingCustomer.status])}>
                      {viewingCustomer.status}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportSingleCustomer(viewingCustomer)}
                    disabled={loadingOrders}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                    <p className="text-lg font-bold">{viewingCustomer.orderCount}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                    <p className="text-lg font-bold">{formatCurrency(viewingCustomer.totalSpent)}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-xs text-muted-foreground">Fume Points</p>
                    <p className="text-lg font-bold text-primary">{viewingCustomer.fume_points_balance}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Member Since</p>
                    <p className="text-lg font-bold">{formatDate(viewingCustomer.created_at)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
                  {viewingCustomer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{viewingCustomer.phone}</span>
                    </div>
                  )}
                  {viewingCustomer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{viewingCustomer.email}</span>
                    </div>
                  )}
                  {viewingCustomer.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{viewingCustomer.address}</span>
                    </div>
                  )}
                  {viewingCustomer.date_of_birth && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>DOB: {formatDate(viewingCustomer.date_of_birth)}</span>
                    </div>
                  )}
                </div>
                
                {viewingCustomer.notes && (
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{viewingCustomer.notes}</p>
                  </div>
                )}
                
                {/* Order History */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold">Order History</h4>
                  </div>
                  
                  {loadingOrders ? (
                    <div className="p-6 text-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">Loading orders...</p>
                    </div>
                  ) : customerOrders.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground bg-muted/20 rounded-lg">
                      No orders found for this customer
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {customerOrders.map(order => (
                        <div key={order.id} className="p-3 bg-muted/20 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="font-medium text-sm">{order.order_number}</span>
                              <span className="mx-2 text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                'text-xs px-2 py-0.5 rounded-full capitalize',
                                order.status === 'delivered' && 'bg-success/20 text-success',
                                order.status === 'paid' && 'bg-info/20 text-info',
                                order.status === 'shipped' && 'bg-warning/20 text-warning',
                                order.status === 'created' && 'bg-muted text-muted-foreground'
                              )}>
                                {order.status}
                              </span>
                              <span className="font-semibold">{formatCurrency(order.total)}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.items.map((item, idx) => (
                              <span key={item.id}>
                                {item.cigar_name} ×{item.quantity}
                                {idx < order.items.length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                          {order.fume_points_earned > 0 && (
                            <div className="text-xs text-primary mt-1">
                              +{order.fume_points_earned} Fume Points earned
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setViewDialogOpen(false);
                      openEditDialog(viewingCustomer);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    className="flex-1 btn-primary"
                    onClick={() => setViewDialogOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* CSV Preview Dialog */}
        <Dialog open={csvPreviewOpen} onOpenChange={setCsvPreviewOpen}>
          <DialogContent className="glass-card max-w-xl max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview Import Data</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Duplicate handling */}
              {csvPreviewData.some(c => c.existingPhone) && (
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-sm font-medium text-warning mb-2">
                    {csvPreviewData.filter(c => c.existingPhone).length} customers already exist (by phone number)
                  </p>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="duplicateAction"
                        checked={duplicateAction === 'skip'}
                        onChange={() => setDuplicateAction('skip')}
                        className="accent-primary"
                      />
                      <span className="text-sm">Skip duplicates</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="duplicateAction"
                        checked={duplicateAction === 'update'}
                        onChange={() => setDuplicateAction('update')}
                        className="accent-primary"
                      />
                      <span className="text-sm">Update existing</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Preview table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">Status</th>
                        <th className="text-left p-2 font-medium">Name</th>
                        <th className="text-left p-2 font-medium">Phone</th>
                        <th className="text-left p-2 font-medium">Email</th>
                        <th className="text-left p-2 font-medium">DOB</th>
                        <th className="text-right p-2 font-medium">Orders</th>
                        <th className="text-right p-2 font-medium">Total Spent</th>
                        <th className="text-right p-2 font-medium">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreviewData.map((c, i) => (
                        <tr key={i} className={cn("border-t", c.existingPhone && "bg-warning/5")}>
                          <td className="p-2">
                            {c.existingPhone ? (
                              <span className="px-2 py-0.5 text-xs rounded bg-warning/20 text-warning">Exists</span>
                            ) : (
                              <span className="px-2 py-0.5 text-xs rounded bg-success/20 text-success">New</span>
                            )}
                          </td>
                          <td className="p-2 font-medium">{c.name}</td>
                          <td className="p-2 text-muted-foreground">{c.phone || '-'}</td>
                          <td className="p-2 text-muted-foreground">{c.email || '-'}</td>
                          <td className="p-2 text-muted-foreground">{c.date_of_birth || '-'}</td>
                          <td className="p-2 text-right">{c.orderCount}</td>
                          <td className="p-2 text-right">{formatCurrency(c.totalSpent)}</td>
                          <td className="p-2 text-right">{c.fume_points_balance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {csvPreviewData.filter(c => !c.existingPhone).length} new • 
                  {csvPreviewData.filter(c => c.existingPhone).length} existing
                </span>
                <span>
                  {duplicateAction === 'skip' 
                    ? `${csvPreviewData.filter(c => !c.existingPhone).length} will be imported`
                    : `${csvPreviewData.length} will be processed`
                  }
                </span>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => { setCsvPreviewOpen(false); setCsvPreviewData([]); }}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 btn-primary"
                  onClick={confirmCsvImport}
                  disabled={uploading}
                >
                  {uploading ? 'Importing...' : 'Confirm Import'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

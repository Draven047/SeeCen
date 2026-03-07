import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, ShoppingCart, Filter, Plus, Minus, Trash2, AlertCircle, X, QrCode, FileText, CheckCircle, User, Eye, MapPin, Package, Clock, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { getSafeErrorMessage, sanitizeForLike, isValidPhoneInput } from '@/lib/errorUtils';
import { generateTaxInvoice, type LegacyInvoiceData, type InvoiceStore } from '@/lib/invoiceGenerator';
import { useFinanceAudit } from '@/hooks/useFinanceAudit';

interface Cigar {
  id: string;
  name: string;
  shape: string;
  wrapper: string;
  origin: string;
  price: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  image_url: string | null;
  size: string | null;
  filler: string | null;
  description: string | null;
}

interface CartItem {
  cigar: Cigar;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  fume_points_balance: number;
}

interface Store {
  id: string;
  name: string;
}

interface StoreTaxSettings {
  store_id: string;
  state_name: string;
  state_code: string;
  default_cgst_rate: number;
  default_sgst_rate: number;
  default_igst_rate: number;
  default_cess_rate: number;
  cess_enabled: boolean;
}

type PaymentStatus = 'pending_payment' | 'payment_confirmed' | 'payment_failed';

const PAYMENT_TIMEOUT_SECONDS = 180; // 3 minutes

export default function CreateOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logAudit } = useFinanceAudit();
  
  const [step, setStep] = useState(1);
  const [cigars, setCigars] = useState<Cigar[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [shapeFilter, setShapeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Customer state
  const [customerPhone, setCustomerPhone] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '', address: '' });
  
  // Store state
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [storeTaxSettings, setStoreTaxSettings] = useState<StoreTaxSettings | null>(null);
  
  // Order state
  const [notes, setNotes] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  
  // Payment flow state
  const [createdOrder, setCreatedOrder] = useState<{ id: string; order_number: string; total: number } | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(PAYMENT_TIMEOUT_SECONDS);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paymentConfirmedRef = useRef(false);
  
  // Quick view modal state
  const [quickViewCigar, setQuickViewCigar] = useState<Cigar | null>(null);
  const [quickViewQty, setQuickViewQty] = useState(1);
  
  // Quantity tracker for product cards
  const [cardQuantities, setCardQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchCigars();
    fetchStores();
    
    const cigarId = searchParams.get('cigar');
    if (cigarId) {
      addCigarById(cigarId);
    }

    // Listen for barcode scan events from the FAB scanner
    const handleBarcodeFound = (e: CustomEvent<{ cigarId: string }>) => {
      addCigarById(e.detail.cigarId);
    };
    window.addEventListener('barcode-product-found', handleBarcodeFound as EventListener);
    return () => window.removeEventListener('barcode-product-found', handleBarcodeFound as EventListener);
  }, []);

  // Payment timeout countdown
  useEffect(() => {
    if (paymentStatus === 'pending_payment') {
      paymentConfirmedRef.current = false;
      setTimeRemaining(PAYMENT_TIMEOUT_SECONDS);
      
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Timeout reached
            if (!paymentConfirmedRef.current) {
              handlePaymentTimeout();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [paymentStatus]);

  // Handle beforeunload (browser close/refresh) during pending payment
  useEffect(() => {
    if (paymentStatus !== 'pending_payment') return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!paymentConfirmedRef.current) {
        e.preventDefault();
        e.returnValue = 'Payment is pending. Are you sure you want to leave?';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [paymentStatus]);

  // Handle back navigation during pending payment
  useEffect(() => {
    if (paymentStatus !== 'pending_payment') return;
    
    const handlePopState = () => {
      if (!paymentConfirmedRef.current && createdOrder) {
        markPaymentFailed(createdOrder.id, 'user_exit');
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [paymentStatus, createdOrder]);

  const handlePaymentTimeout = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (createdOrder && !paymentConfirmedRef.current) {
      await markPaymentFailed(createdOrder.id, 'timeout');
    }
  }, [createdOrder]);

  const markPaymentFailed = async (orderId: string, reason: string) => {
    setPaymentStatus('payment_failed');
    if (timerRef.current) clearInterval(timerRef.current);

    await supabase.from('orders').update({
      payment_status: 'payment_failed',
      payment_failed_at: new Date().toISOString(),
      payment_failure_reason: reason,
    }).eq('id', orderId);
    
    await logAudit({
      entityType: 'order',
      entityId: orderId,
      actionType: 'payment_failed',
      storeId: selectedStore || null,
      afterData: { payment_status: 'payment_failed', reason },
      reason: reason === 'timeout' ? 'Payment timed out after 3 minutes' : 'User exited payment screen',
    });
    
    toast.error(reason === 'timeout' ? 'Payment timed out. Order not confirmed.' : 'Payment cancelled.');
  };

  const fetchCigars = async () => {
    // Fetch from both cigars (legacy) and products tables, merge into unified list
    const [cigarsRes, productsRes] = await Promise.all([
      supabase.from('cigars').select('*').order('name'),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
    ]);

    const legacyCigars = (cigarsRes.data as Cigar[]) || [];
    const legacyCigarIds = new Set(legacyCigars.map(c => c.id));

    // Map products to Cigar interface shape (only those not already in cigars table)
    const productsCigars: Cigar[] = ((productsRes.data || []) as any[])
      .filter(p => !legacyCigarIds.has(p.id))
      .map(p => ({
        id: p.id,
        name: p.name,
        shape: p.category || 'General',
        wrapper: p.brand || '—',
        origin: '—',
        price: p.base_price,
        stock_status: 'in_stock' as const,
        image_url: p.image_urls?.[0] || null,
        size: null,
        filler: null,
        description: p.description,
      }));

    setCigars([...legacyCigars, ...productsCigars]);
    setLoading(false);
  };

  const fetchStores = async () => {
    const { data } = await supabase.from('stores').select('id, name').order('name');
    setStores(data || []);
    if (data && data.length > 0) {
      setSelectedStore(data[0].id);
      fetchStoreTaxSettings(data[0].id);
    }
  };

  const fetchStoreTaxSettings = async (storeId: string) => {
    const { data } = await supabase
      .from('store_tax_settings')
      .select('*')
      .eq('store_id', storeId)
      .single();
    
    if (data) {
      setStoreTaxSettings(data as StoreTaxSettings);
    } else {
      setStoreTaxSettings({
        store_id: storeId,
        state_name: 'Maharashtra',
        state_code: '27',
        default_cgst_rate: 14,
        default_sgst_rate: 14,
        default_igst_rate: 28,
        default_cess_rate: 0,
        cess_enabled: false
      });
    }
  };

  useEffect(() => {
    if (selectedStore) {
      fetchStoreTaxSettings(selectedStore);
    }
  }, [selectedStore]);

  const addCigarById = async (cigarId: string) => {
    const { data } = await supabase.from('cigars').select('*').eq('id', cigarId).single();
    if (data) {
      addToCart(data as Cigar);
    }
  };

  const lookupCustomer = async () => {
    const trimmedPhone = customerPhone.trim();
    if (!trimmedPhone) return;
    
    if (!isValidPhoneInput(trimmedPhone)) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    if (trimmedPhone.length < 3) {
      toast.error('Please enter at least 3 digits');
      return;
    }
    
    setLookingUp(true);
    const sanitizedPhone = sanitizeForLike(trimmedPhone);
    
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, email, address, fume_points_balance')
      .ilike('phone', `%${sanitizedPhone}%`)
      .maybeSingle();
    
    if (data) {
      setCustomer(data);
      if (data.address) setShippingAddress(data.address);
      toast.success(`Found customer: ${data.name}`);
    } else {
      toast.info('Customer not found. You can create a new one.');
      setShowNewCustomer(true);
      setNewCustomerForm(prev => ({ ...prev, phone: trimmedPhone }));
    }
    setLookingUp(false);
  };

  const createNewCustomer = async () => {
    if (!newCustomerForm.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    
    const { data, error } = await supabase.from('customers').insert({
      name: newCustomerForm.name,
      phone: newCustomerForm.phone || null,
      email: newCustomerForm.email || null,
      address: newCustomerForm.address || null,
      created_by: user?.id
    }).select().single();
    
    if (error) {
      toast.error('Failed to create customer');
      return;
    }
    
    setCustomer(data);
    if (data.address) setShippingAddress(data.address);
    setShowNewCustomer(false);
    toast.success('Customer created successfully!');
  };

  const addToCart = (cigar: Cigar, qty: number = 1) => {
    const existing = cart.find(item => item.cigar.id === cigar.id);
    if (existing) {
      setCart(cart.map(item => 
        item.cigar.id === cigar.id 
          ? { ...item, quantity: item.quantity + qty }
          : item
      ));
    } else {
      setCart([...cart, { cigar, quantity: qty }]);
    }
    setCardQuantities(prev => ({ ...prev, [cigar.id]: 1 }));
    toast.success(`Added ${qty} × ${cigar.name} to cart`);
  };

  const updateQuantity = (cigarId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.cigar.id === cigarId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (cigarId: string) => {
    setCart(cart.filter(item => item.cigar.id !== cigarId));
  };

  const getCardQty = (cigarId: string) => cardQuantities[cigarId] || 0;
  
  const updateCardQty = (cigarId: string, delta: number) => {
    setCardQuantities(prev => ({
      ...prev,
      [cigarId]: Math.max(0, (prev[cigarId] || 0) + delta)
    }));
  };

  const openQuickView = (cigar: Cigar) => {
    setQuickViewCigar(cigar);
    setQuickViewQty(getCardQty(cigar.id) || 1);
  };

  const addFromQuickView = () => {
    if (quickViewCigar) {
      addToCart(quickViewCigar, quickViewQty);
      setCardQuantities(prev => ({ ...prev, [quickViewCigar.id]: quickViewQty }));
      setQuickViewCigar(null);
      setQuickViewQty(1);
    }
  };

  const wrappers = [...new Set(cigars.map(c => c.wrapper))];
  const shapes = [...new Set(cigars.map(c => c.shape))];
  const brands = [...new Set(cigars.map(c => c.name.split(' ')[0]))].sort();

  const filtered = cigars.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const cigarBrand = c.name.split(' ')[0];
    const matchBrand = brandFilter === 'all' || cigarBrand === brandFilter;
    const matchShape = shapeFilter === 'all' || c.shape === shapeFilter;
    return matchSearch && matchBrand && matchShape;
  });

  const clearFilters = () => {
    setSearch('');
    setBrandFilter('all');
    setShapeFilter('all');
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.cigar.price * item.quantity), 0);
  
  const cgstRate = storeTaxSettings?.default_cgst_rate || 14;
  const sgstRate = storeTaxSettings?.default_sgst_rate || 14;
  const cessRate = storeTaxSettings?.cess_enabled ? (storeTaxSettings?.default_cess_rate || 0) : 0;
  
  const cgstAmount = subtotal * (cgstRate / 100);
  const sgstAmount = subtotal * (sgstRate / 100);
  const cessAmount = subtotal * (cessRate / 100);
  const totalTax = cgstAmount + sgstAmount + cessAmount;
  const total = subtotal + totalTax;

  const generateQRCode = async (orderNumber: string, amount: number) => {
    const upiLink = `upi://pay?pa=clozzet@upi&pn=Clozzet&am=${amount}&tn=Order%20${orderNumber}`;
    const qrUrl = await QRCode.toDataURL(upiLink, { width: 200, margin: 2 });
    return qrUrl;
  };

  const generateInvoicePDF = async (order: any, items: CartItem[]) => {
    // Fetch store finance settings for dynamic branding
    let storeData: InvoiceStore = {
      name: 'Store',
      stateName: storeTaxSettings?.state_name,
      stateCode: storeTaxSettings?.state_code,
    };

    if (selectedStore) {
      const [storeRes, financeRes] = await Promise.all([
        supabase.from('stores').select('name, address, phone').eq('id', selectedStore).single(),
        supabase.from('store_finance_settings').select('*').eq('store_id', selectedStore).maybeSingle(),
      ]);
      if (storeRes.data) {
        storeData.name = storeRes.data.name;
        storeData.address = storeRes.data.address;
        storeData.phone = storeRes.data.phone;
      }
      if (financeRes.data) {
        storeData.gstin = financeRes.data.gstin;
        storeData.bankName = financeRes.data.bank_name;
        storeData.accountNumber = financeRes.data.account_number;
        storeData.accountHolder = financeRes.data.account_holder;
        storeData.ifscCode = financeRes.data.ifsc_code;
        storeData.upiId = financeRes.data.upi_id;
        storeData.invoiceFooter = financeRes.data.invoice_footer;
        storeData.termsAndConditions = financeRes.data.terms_and_conditions;
        storeData.returnPolicy = (financeRes.data as any).return_policy;
        storeData.footerNotes = (financeRes.data as any).footer_notes;
        storeData.invoiceType = (financeRes.data as any).invoice_type;
      }
    }

    const invoiceData: LegacyInvoiceData = {
      orderNumber: order.order_number,
      invoiceNumber: order.invoice_number,
      invoiceDate: new Date(),
      customer: {
        name: customer?.name || 'Walk-in Customer',
        phone: customer?.phone,
        address: customer?.address,
        gstin: null,
        state: storeTaxSettings?.state_name || 'Maharashtra',
        stateCode: storeTaxSettings?.state_code || '27'
      },
      shippingAddress: shippingAddress || customer?.address,
      items: items.map(item => ({
        name: item.cigar.name,
        quantity: item.quantity,
        rate: item.cigar.price,
        discount: 0
      })),
      subtotal,
      cgst: cgstAmount,
      cgstRate,
      sgst: sgstAmount,
      sgstRate,
      igst: 0,
      igstRate: 0,
      cess: cessAmount,
      cessRate,
      packingCharges: 0,
      total,
      channel: 'in_store',
      paymentMode: 'UPI',
      paymentStatus: 'Confirmed',
      store: storeData,
    };
    
    return generateTaxInvoice(invoiceData);
  };

  // Step 3: Create order with pending_payment status (does NOT count as successful yet)
  const handleCreateOrder = async () => {
    if (cart.length === 0) {
      toast.error('Please add items to your cart');
      return;
    }
    
    if (!selectedStore) {
      toast.error('Please select a store');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          created_by: user!.id,
          customer_id: customer?.id || null,
          store_id: selectedStore,
          subtotal,
          tax: totalTax,
          total,
          cgst_rate: cgstRate,
          cgst_amount: cgstAmount,
          sgst_rate: sgstRate,
          sgst_amount: sgstAmount,
          igst_rate: 0,
          igst_amount: 0,
          cess_rate: cessRate,
          cess_amount: cessAmount,
          place_of_supply_state: storeTaxSettings?.state_name || 'Maharashtra',
          place_of_supply_code: storeTaxSettings?.state_code || '27',
          status: 'created' as const,
          payment_status: 'pending_payment',
          channel: 'in_store',
          fulfillment_status: 'unfulfilled',
          notes,
          shipping_address: shippingAddress || customer?.address || null,
          billing_address: customer?.address || null,
          order_number: 'PENDING'
        }])
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Create order items
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        cigar_id: item.cigar.id,
        quantity: item.quantity,
        unit_price: item.cigar.price,
        total_price: item.cigar.price * item.quantity
      }));
      
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;
      
      // Generate QR code
      const qrUrl = await generateQRCode(orderData.order_number, total);
      setQrCodeUrl(qrUrl);
      
      // Update order with QR code
      await supabase.from('orders').update({ payment_qr_code: qrUrl }).eq('id', orderData.id);
      
      await logAudit({
        entityType: 'order',
        entityId: orderData.id,
        actionType: 'order_created_pending_payment',
        storeId: selectedStore,
        afterData: { payment_status: 'pending_payment', total },
      });
      
      setCreatedOrder(orderData);
      setPaymentStatus('pending_payment');
      setStep(4); // Move to payment step
      
    } catch (error: any) {
      console.error('Order creation failed:', error);
      toast.error(getSafeErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm payment — idempotent (prevents double-click)
  const handleConfirmPayment = async () => {
    if (!createdOrder || confirmingPayment || paymentConfirmedRef.current) return;
    
    setConfirmingPayment(true);
    paymentConfirmedRef.current = true;
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    try {
      const { error } = await supabase.from('orders').update({
        payment_status: 'payment_confirmed',
        payment_confirmed_at: new Date().toISOString(),
      }).eq('id', createdOrder.id);
      
      if (error) throw error;
      
      // Update customer's last order date only on confirmed payment
      if (customer) {
        await supabase.from('customers').update({ last_order_date: new Date().toISOString() }).eq('id', customer.id);
      }
      
      await logAudit({
        entityType: 'order',
        entityId: createdOrder.id,
        actionType: 'payment_confirmed',
        storeId: selectedStore || null,
        beforeData: { payment_status: 'pending_payment' },
        afterData: { payment_status: 'payment_confirmed' },
      });
      
      setPaymentStatus('payment_confirmed');
      toast.success('Payment confirmed. Order created.');
      
    } catch (error: any) {
      paymentConfirmedRef.current = false;
      toast.error(getSafeErrorMessage(error));
    } finally {
      setConfirmingPayment(false);
    }
  };

  // Retry payment — resets to pending
  const handleRetryPayment = async () => {
    if (!createdOrder) return;
    
    paymentConfirmedRef.current = false;
    
    await supabase.from('orders').update({
      payment_status: 'pending_payment',
      payment_failed_at: null,
      payment_failure_reason: null,
    }).eq('id', createdOrder.id);
    
    await logAudit({
      entityType: 'order',
      entityId: createdOrder.id,
      actionType: 'payment_retry',
      storeId: selectedStore || null,
      beforeData: { payment_status: 'payment_failed' },
      afterData: { payment_status: 'pending_payment' },
    });
    
    setPaymentStatus('pending_payment');
    toast.info('Payment retried. Scan QR to pay.');
  };

  const downloadInvoice = async () => {
    if (!createdOrder) return;
    const doc = await generateInvoicePDF(createdOrder, cart);
    doc.save(`Invoice-${createdOrder.order_number}.pdf`);
  };

  const downloadLabel = () => {
    if (!createdOrder) return;
    const doc = new jsPDF({ format: [100, 150] });
    
    doc.setFontSize(14);
    doc.text('Clozzet', 50, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Order: ${createdOrder.order_number}`, 50, 25, { align: 'center' });
    
    doc.setFontSize(9);
    doc.text('Ship To:', 10, 40);
    doc.setFontSize(11);
    doc.text(customer?.name || 'Customer', 10, 48);
    if (shippingAddress) {
      const lines = doc.splitTextToSize(shippingAddress, 80);
      doc.setFontSize(9);
      doc.text(lines, 10, 56);
    }
    if (customer?.phone) {
      doc.text(`Phone: ${customer.phone}`, 10, 75);
    }
    
    doc.setFontSize(12);
    doc.text(`Items: ${cart.reduce((sum, i) => sum + i.quantity, 0)}`, 10, 90);
    doc.text(`Total: ₹${total.toLocaleString()}`, 10, 100);
    
    doc.save(`Label-${createdOrder.order_number}.pdf`);
  };

  const handleDone = () => {
    navigate('/orders');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-display">Create New Order</h1>
          <p className="text-muted-foreground text-sm mt-1">
            For customers visiting the store or ordering via phone call
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4">
          {[
            { num: 1, label: 'Select Items' },
            { num: 2, label: 'Customer' },
            { num: 3, label: 'Review' },
            { num: 4, label: 'Payment' }
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-4">
              <button 
                onClick={() => {
                  // Don't allow going back from payment step
                  if (step === 4) return;
                  if (s.num < step) setStep(s.num);
                }}
                disabled={step === 4}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all",
                  step >= s.num ? "opacity-100" : "opacity-50",
                  step === 4 && "cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all",
                  step >= s.num 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
                </div>
                <span className="text-xs font-medium">{s.label}</span>
              </button>
              {i < 3 && (
                <div className={cn(
                  "w-12 h-0.5 transition-all mb-6",
                  step > s.num ? "bg-primary" : "bg-border"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Items */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Search & Filter */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Search & Filter Products</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 bg-input"
                    />
                  </div>
                  <Select value={brandFilter} onValueChange={setBrandFilter}>
                    <SelectTrigger className="w-[140px] bg-input">
                      <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={shapeFilter} onValueChange={setShapeFilter}>
                    <SelectTrigger className="w-[140px] bg-input">
                      <SelectValue placeholder="All Shapes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Shapes</SelectItem>
                      {shapes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={clearFilters} size="sm">
                    Clear
                  </Button>
                </div>
              </div>

              <div className="glass-card p-4">
                <div className="mb-4">
                  <h3 className="font-semibold">Available Products ({filtered.length})</h3>
                </div>
                
                {loading ? (
                  <div className="py-12 text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-12 text-center">
                    <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <p className="text-muted-foreground">No products found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
                    {filtered.map(cigar => {
                      const qty = getCardQty(cigar.id);
                      return (
                        <div 
                          key={cigar.id} 
                          className="group bg-muted/30 rounded-lg overflow-hidden hover:bg-muted/50 transition-all hover:shadow-md border border-transparent hover:border-primary/20"
                        >
                          <div 
                            className="aspect-square bg-muted/50 relative overflow-hidden cursor-pointer"
                            onClick={() => openQuickView(cigar)}
                          >
                            {cigar.image_url ? (
                              <img 
                                src={cigar.image_url} 
                                alt={cigar.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="text-4xl opacity-30">🚬</div>
                              </div>
                            )}
                            <div className={cn(
                              "absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                              cigar.stock_status === 'in_stock' && "bg-success/90 text-white",
                              cigar.stock_status === 'low_stock' && "bg-warning/90 text-white",
                              cigar.stock_status === 'out_of_stock' && "bg-destructive/90 text-white"
                            )}>
                              {cigar.stock_status === 'in_stock' ? 'In Stock' : cigar.stock_status === 'low_stock' ? 'Low' : 'Out'}
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-xs font-medium flex items-center gap-1 bg-black/50 px-2 py-1 rounded">
                                <Eye className="w-3 h-3" /> Quick View
                              </span>
                            </div>
                          </div>
                          
                          <div className="p-3 space-y-2">
                            <h4 className="font-medium text-sm leading-tight line-clamp-2">{cigar.name}</h4>
                            <div className="text-xs text-muted-foreground">
                              <p>{cigar.wrapper} • {cigar.shape}</p>
                            </div>
                            <div className="font-bold text-primary">₹{cigar.price.toLocaleString()}</div>
                            
                            <div className="pt-1">
                              {qty === 0 ? (
                                <Button 
                                  size="sm" 
                                  onClick={(e) => { e.stopPropagation(); updateCardQty(cigar.id, 1); addToCart(cigar, 1); }}
                                  className="btn-primary text-xs h-8 w-full"
                                  disabled={cigar.stock_status === 'out_of_stock'}
                                >
                                  <ShoppingCart className="w-3 h-3 mr-1" /> ADD
                                </Button>
                              ) : (
                                <div className="flex items-center justify-between border border-primary rounded-md bg-primary/5 h-8">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 hover:bg-primary/10"
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      if (qty === 1) {
                                        removeFromCart(cigar.id);
                                        setCardQuantities(prev => ({ ...prev, [cigar.id]: 0 }));
                                      } else {
                                        updateCardQty(cigar.id, -1);
                                        updateQuantity(cigar.id, qty - 1);
                                      }
                                    }}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="text-sm font-semibold text-primary">{qty}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 hover:bg-primary/10"
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      updateCardQty(cigar.id, 1);
                                      updateQuantity(cigar.id, qty + 1);
                                    }}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Cart Sidebar */}
            <div className="space-y-4">
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="font-semibold">Cart ({cart.length})</span>
                </div>
                
                {cart.length === 0 ? (
                  <div className="py-8 text-center">
                    <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-sm text-muted-foreground">Cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.cigar.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.cigar.name}</p>
                          <p className="text-xs text-muted-foreground">₹{item.cigar.price} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.cigar.id, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.cigar.id, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.cigar.id)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-border space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>₹{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>CGST @ {cgstRate}%</span>
                        <span>₹{cgstAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>SGST @ {sgstRate}%</span>
                        <span>₹{sgstAmount.toLocaleString()}</span>
                      </div>
                      {cessRate > 0 && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>CESS @ {cessRate}%</span>
                          <span>₹{cessAmount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Total Tax</span>
                        <span>₹{totalTax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg pt-2">
                        <span>Total</span>
                        <span className="text-primary">₹{total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button 
                className="w-full btn-primary" 
                disabled={cart.length === 0}
                onClick={() => setStep(2)}
              >
                Continue to Customer
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Customer Details */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Details
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Lookup by Mobile Number</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="+91 98765 43210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="bg-input"
                    />
                    <Button onClick={lookupCustomer} disabled={lookingUp} className="btn-primary">
                      {lookingUp ? '...' : 'Search'}
                    </Button>
                  </div>
                </div>
                
                {customer && (
                  <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-success">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.phone}</p>
                        {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                            🔥 {customer.fume_points_balance} Fume Points
                          </span>
                          {customer.fume_points_balance >= 100 && (
                            <span className="text-xs text-muted-foreground">
                              (₹{customer.fume_points_balance} redeemable)
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setCustomer(null)}>
                        Change
                      </Button>
                    </div>
                  </div>
                )}
                
                {!customer && (
                  <Button variant="outline" onClick={() => setShowNewCustomer(true)} className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Create New Customer
                  </Button>
                )}
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Order Details</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Store *</Label>
                  <Select value={selectedStore} onValueChange={setSelectedStore}>
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map(store => (
                        <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Shipping Address</Label>
                  <Textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Enter shipping address..."
                    className="bg-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Order Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions..."
                    className="bg-input"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button className="flex-1 btn-primary" onClick={() => setStep(3)}>
                Review Order
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Order Summary</h3>
              
              <div className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{customer?.name || 'Walk-in Customer'}</p>
                  {customer?.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Store & Tax Settings</p>
                  <p className="font-medium">{stores.find(s => s.id === selectedStore)?.name || 'Store'}</p>
                  <p className="text-xs text-muted-foreground">
                    State: {storeTaxSettings?.state_name} ({storeTaxSettings?.state_code}) • 
                    CGST: {cgstRate}% • SGST: {sgstRate}%{cessRate > 0 ? ` • CESS: ${cessRate}%` : ''}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Items ({cart.length})</p>
                  {cart.map(item => (
                    <div key={item.cigar.id} className="flex justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium">{item.cigar.name}</p>
                        <p className="text-sm text-muted-foreground">₹{item.cigar.price} × {item.quantity}</p>
                      </div>
                      <p className="font-medium">₹{(item.cigar.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4 border-t border-border space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>CGST @ {cgstRate}%</span>
                    <span>₹{cgstAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>SGST @ {sgstRate}%</span>
                    <span>₹{sgstAmount.toLocaleString()}</span>
                  </div>
                  {cessRate > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>CESS @ {cessRate}%</span>
                      <span>₹{cessAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Tax</span>
                    <span>₹{totalTax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold pt-2">
                    <span>Total</span>
                    <span className="text-primary">₹{Math.round(total).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Back
              </Button>
              <Button 
                className="flex-1 btn-primary" 
                onClick={handleCreateOrder}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : 'Proceed to Payment'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Payment Confirmation */}
        {step === 4 && createdOrder && (
          <div className="max-w-md mx-auto space-y-6">
            {/* Payment Status Badge */}
            <div className="glass-card p-6 text-center space-y-5">
              {/* Status indicator */}
              <div className="flex justify-center">
                {paymentStatus === 'pending_payment' && (
                  <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center animate-pulse">
                    <Clock className="w-8 h-8 text-warning" />
                  </div>
                )}
                {paymentStatus === 'payment_confirmed' && (
                  <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                )}
                {paymentStatus === 'payment_failed' && (
                  <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-destructive" />
                  </div>
                )}
              </div>

              {/* Status text */}
              <div>
                {paymentStatus === 'pending_payment' && (
                  <>
                    <h2 className="text-xl font-bold">Awaiting Payment</h2>
                    <p className="text-muted-foreground text-sm">Order #{createdOrder.order_number}</p>
                  </>
                )}
                {paymentStatus === 'payment_confirmed' && (
                  <>
                    <h2 className="text-xl font-bold text-success">Payment Confirmed!</h2>
                    <p className="text-muted-foreground text-sm">Order #{createdOrder.order_number} is now active</p>
                  </>
                )}
                {paymentStatus === 'payment_failed' && (
                  <>
                    <h2 className="text-xl font-bold text-destructive">Payment Failed</h2>
                    <p className="text-muted-foreground text-sm">Order #{createdOrder.order_number} was not confirmed</p>
                  </>
                )}
              </div>

              {/* Countdown timer for pending */}
              {paymentStatus === 'pending_payment' && (
                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono font-semibold",
                  timeRemaining <= 30 ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                )}>
                  <Clock className="w-4 h-4" />
                  {formatTime(timeRemaining)} remaining
                </div>
              )}

              {/* QR Code — show for pending */}
              {paymentStatus === 'pending_payment' && qrCodeUrl && (
                <div className="p-4 bg-white rounded-lg inline-block">
                  <img src={qrCodeUrl} alt="Payment QR Code" className="w-48 h-48" />
                  <p className="text-xs text-center mt-2 text-muted-foreground">
                    Scan to pay ₹{Math.round(total).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Payment Done button */}
              {paymentStatus === 'pending_payment' && (
                <Button 
                  className="w-full btn-primary h-12 text-base"
                  onClick={handleConfirmPayment}
                  disabled={confirmingPayment}
                >
                  {confirmingPayment ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Confirming...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Payment Done
                    </div>
                  )}
                </Button>
              )}

              {/* Retry button for failed */}
              {paymentStatus === 'payment_failed' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    The payment was not completed. You can retry or go back to orders.
                  </p>
                  <Button 
                    className="w-full btn-primary"
                    onClick={handleRetryPayment}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Payment
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={handleDone}
                  >
                    Back to Orders
                  </Button>
                </div>
              )}

              {/* Post-confirmation actions */}
              {paymentStatus === 'payment_confirmed' && (
                <div className="space-y-4">
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={downloadInvoice}>
                      <FileText className="w-4 h-4 mr-2" /> Invoice
                    </Button>
                    <Button variant="outline" onClick={downloadLabel}>
                      <QrCode className="w-4 h-4 mr-2" /> Label
                    </Button>
                  </div>
                  
                  <Button className="w-full btn-primary" onClick={handleDone}>
                    Done
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Customer Dialog */}
        <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
          <DialogContent className="glass-card">
            <DialogHeader>
              <DialogTitle>Create New Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newCustomerForm.email}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  className="bg-input"
                />
              </div>
              <Button onClick={createNewCustomer} className="w-full btn-primary">
                Create Customer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick View Modal */}
        <Dialog open={!!quickViewCigar} onOpenChange={() => setQuickViewCigar(null)}>
          <DialogContent className="glass-card max-w-lg">
            {quickViewCigar && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-lg">{quickViewCigar.name}</DialogTitle>
                </DialogHeader>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-square bg-muted/50 rounded-lg overflow-hidden">
                    {quickViewCigar.image_url ? (
                      <img 
                        src={quickViewCigar.image_url} 
                        alt={quickViewCigar.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-6xl opacity-30">🚬</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className={cn(
                      "inline-flex text-xs font-medium px-2 py-1 rounded-full",
                      quickViewCigar.stock_status === 'in_stock' && "bg-success/20 text-success",
                      quickViewCigar.stock_status === 'low_stock' && "bg-warning/20 text-warning",
                      quickViewCigar.stock_status === 'out_of_stock' && "bg-destructive/20 text-destructive"
                    )}>
                      {quickViewCigar.stock_status === 'in_stock' ? 'In Stock' : quickViewCigar.stock_status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span><strong>Shape:</strong> {quickViewCigar.shape}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 text-center text-muted-foreground">🍂</span>
                        <span><strong>Wrapper:</strong> {quickViewCigar.wrapper}</span>
                      </div>
                      {quickViewCigar.filler && (
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 text-center text-muted-foreground">🌿</span>
                          <span><strong>Filler:</strong> {quickViewCigar.filler}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span><strong>Origin:</strong> {quickViewCigar.origin}</span>
                      </div>
                      {quickViewCigar.size && (
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 text-center text-muted-foreground">📏</span>
                          <span><strong>Size:</strong> {quickViewCigar.size}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-2xl font-bold text-primary">
                      ₹{quickViewCigar.price.toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {quickViewCigar.description && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">{quickViewCigar.description}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <div className="flex items-center border border-border rounded-md bg-background">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9"
                      onClick={() => setQuickViewQty(prev => Math.max(1, prev - 1))}
                      disabled={quickViewQty <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-10 text-center font-medium">{quickViewQty}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9"
                      onClick={() => setQuickViewQty(prev => prev + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button 
                    onClick={addFromQuickView}
                    className="btn-primary flex-1"
                    disabled={quickViewCigar.stock_status === 'out_of_stock'}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart — ₹{(quickViewCigar.price * quickViewQty).toLocaleString()}
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

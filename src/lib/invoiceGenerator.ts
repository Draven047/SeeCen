import jsPDF from 'jspdf';

// ─── Types ─────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  sr: number;
  productName: string;
  variant?: string; // e.g. "M / Black"
  sku?: string;
  hsn?: string;
  qty: number;
  rate: number;
  discount: number;
  taxableValue: number;
  gstPercent: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
}

export interface InvoiceStore {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  stateCode?: string;
  stateName?: string;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  ifscCode?: string | null;
  upiId?: string | null;
  invoiceFooter?: string | null;
  termsAndConditions?: string | null;
  returnPolicy?: string | null;
  footerNotes?: string | null;
  invoiceType?: string; // 'tax_invoice' | 'receipt'
}

export interface InvoiceCustomer {
  name: string;
  phone?: string | null;
  address?: string | null;
  gstin?: string | null;
  state?: string;
  stateCode?: string;
}

export interface InvoiceData {
  invoiceNumber?: string;
  invoiceDate: Date;
  orderNumber: string;
  orderId?: string;
  channel?: string;
  paymentMode?: string;
  paymentStatus?: string;
  upiRef?: string;
  customer: InvoiceCustomer;
  shippingAddress?: string | null;
  placeOfSupplyState?: string;
  placeOfSupplyCode?: string;
  awbNumber?: string;
  deliveryPartner?: string;
  items: InvoiceLineItem[];
  subtotal: number;
  discountTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  shippingFee: number;
  roundOff: number;
  grandTotal: number;
  store: InvoiceStore;
  // rates for display
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  cessRate?: number;
}

// ─── Helpers ───────────────────────────────────────────────────────

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero Rupees Only';
  const convert = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
  };
  let result = '';
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.floor(num % 1000);
  if (crore > 0) result += convert(crore) + ' Crore ';
  if (lakh > 0) result += convert(lakh) + ' Lakh ';
  if (thousand > 0) result += convert(thousand) + ' Thousand ';
  if (remainder > 0) result += convert(remainder);
  return result.trim() + ' Rupees Only';
}

function fmtDate(d: Date): string {
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtCur(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function channelLabel(ch?: string): string {
  const map: Record<string, string> = {
    in_store: 'SeeCen', website: 'Website', instagram: 'Instagram', whatsapp: 'WhatsApp',
    myntra: 'Myntra', flipkart: 'Flipkart', amazon: 'Amazon', ajio: 'Ajio', other: 'Other'
  };
  return map[ch || 'in_store'] || ch || 'SeeCen';
}

// ─── Generator ─────────────────────────────────────────────────────

export function generateClozzetInvoice(data: InvoiceData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = 210, H = 297, M = 10;
  const CW = W - M * 2; // content width
  const isReceipt = !data.store.gstin || data.store.invoiceType === 'receipt';

  // Color palette
  const C = {
    primary: { r: 79, g: 70, b: 229 }, // indigo-600
    black: { r: 20, g: 20, b: 20 },
    dark: { r: 55, g: 55, b: 55 },
    mid: { r: 120, g: 120, b: 120 },
    light: { r: 200, g: 200, b: 200 },
    bg: { r: 248, g: 248, b: 250 },
    white: { r: 255, g: 255, b: 255 },
  };

  let y = M;

  // ──── HELPER: text ────
  const txt = (text: string, x: number, ty: number, opts?: { align?: 'left' | 'right' | 'center'; maxWidth?: number }) => {
    doc.text(text, x, ty, { align: opts?.align || 'left', maxWidth: opts?.maxWidth });
  };

  const setColor = (c: { r: number; g: number; b: number }) => doc.setTextColor(c.r, c.g, c.b);
  const setFill = (c: { r: number; g: number; b: number }) => doc.setFillColor(c.r, c.g, c.b);
  const drawLine = (x1: number, y1: number, x2: number, y2: number, color = C.light) => {
    doc.setDrawColor(color.r, color.g, color.b);
    doc.setLineWidth(0.3);
    doc.line(x1, y1, x2, y2);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HEADER — Store branding left, Invoice meta right
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Store initials badge (if no logo)
  const initials = data.store.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  setFill(C.primary);
  doc.roundedRect(M, y, 14, 14, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  setColor(C.white);
  txt(initials, M + 7, y + 9.5, { align: 'center' });

  // Store name
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  setColor(C.black);
  txt(data.store.name, M + 18, y + 7);

  // Store details
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  setColor(C.dark);
  let storeY = y + 12;
  if (data.store.address) { txt(data.store.address, M + 18, storeY); storeY += 3.5; }
  const contactParts: string[] = [];
  if (data.store.phone) contactParts.push(data.store.phone);
  if (data.store.email) contactParts.push(data.store.email);
  if (contactParts.length) { txt(contactParts.join(' | '), M + 18, storeY); storeY += 3.5; }
  txt(`GSTIN: ${data.store.gstin || 'Unregistered'}`, M + 18, storeY);

  // Right side: Invoice meta
  const rx = W - M;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setColor(C.primary);
  txt(isReceipt ? 'RECEIPT' : 'TAX INVOICE', rx, y + 7, { align: 'right' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  setColor(C.dark);
  let metaY = y + 13;
  const metaLines: [string, string][] = [
    ['Invoice #', data.invoiceNumber || data.orderNumber],
    ['Date', fmtDate(data.invoiceDate)],
    ['Order ID', data.orderNumber],
    ['Channel', channelLabel(data.channel)],
    ['Payment', data.paymentMode || '-'],
    ['Status', data.paymentStatus || '-'],
  ];
  if (data.upiRef) metaLines.push(['UPI/Txn Ref', data.upiRef]);

  metaLines.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    txt(`${label}:`, rx - 55, metaY);
    doc.setFont('helvetica', 'normal');
    txt(val, rx, metaY, { align: 'right' });
    metaY += 3.8;
  });

  y = Math.max(storeY + 4, metaY + 2);

  // Powered by SeeCen
  doc.setFontSize(6);
  setColor(C.mid);
  txt('Powered by SeeCen', M, y);
  y += 5;

  // Divider
  drawLine(M, y, W - M, y, C.light);
  y += 5;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BILLED TO / SHIPPED TO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const halfW = CW / 2 - 5;

  // Billed To
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  setColor(C.mid);
  txt('BILLED TO', M, y);
  txt('SHIPPED TO', M + halfW + 10, y);
  y += 4;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(C.black);
  txt(data.customer.name, M, y);
  txt(data.customer.name, M + halfW + 10, y);
  y += 4;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  setColor(C.dark);
  let billY = y, shipY = y;

  if (data.customer.phone) { txt(`Phone: ${data.customer.phone}`, M, billY); billY += 3.5; }
  if (data.customer.gstin) { txt(`GSTIN: ${data.customer.gstin}`, M, billY); billY += 3.5; }
  if (data.customer.address) {
    const lines = doc.splitTextToSize(data.customer.address, halfW);
    doc.text(lines.slice(0, 3), M, billY);
    billY += lines.length * 3.5;
  }

  const shipAddr = data.shippingAddress || data.customer.address;
  if (data.customer.phone) { txt(`Phone: ${data.customer.phone}`, M + halfW + 10, shipY); shipY += 3.5; }
  if (shipAddr) {
    const lines = doc.splitTextToSize(shipAddr, halfW);
    doc.text(lines.slice(0, 3), M + halfW + 10, shipY);
    shipY += lines.length * 3.5;
  }

  y = Math.max(billY, shipY) + 2;

  // Supply / Transport / AWB row
  doc.setFontSize(7);
  setColor(C.mid);
  const supplyState = data.placeOfSupplyState || data.customer.state || data.store.stateName || '-';
  const supplyCode = data.placeOfSupplyCode || data.customer.stateCode || data.store.stateCode || '-';
  txt(`Place of Supply: ${supplyState} (${supplyCode})`, M, y);
  if (data.awbNumber) {
    txt(`AWB: ${data.awbNumber}${data.deliveryPartner ? ' | ' + data.deliveryPartner : ''}`, rx, y, { align: 'right' });
  }
  y += 5;

  drawLine(M, y, W - M, y, C.light);
  y += 3;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LINE ITEMS TABLE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const showGst = !isReceipt;
  
  // Define columns based on whether GST is shown
  interface Col { label: string; w: number; align: 'left' | 'right' }
  const cols: Col[] = showGst
    ? [
        { label: '#', w: 8, align: 'left' },
        { label: 'Product', w: 42, align: 'left' },
        { label: 'Variant', w: 22, align: 'left' },
        { label: 'HSN', w: 14, align: 'left' },
        { label: 'Qty', w: 10, align: 'right' },
        { label: 'Rate', w: 20, align: 'right' },
        { label: 'Disc', w: 14, align: 'right' },
        { label: 'Taxable', w: 20, align: 'right' },
        { label: 'GST', w: 18, align: 'right' },
        { label: 'Total', w: 22, align: 'right' },
      ]
    : [
        { label: '#', w: 10, align: 'left' },
        { label: 'Product', w: 56, align: 'left' },
        { label: 'Variant', w: 30, align: 'left' },
        { label: 'Qty', w: 14, align: 'right' },
        { label: 'Rate', w: 28, align: 'right' },
        { label: 'Disc', w: 22, align: 'right' },
        { label: 'Total', w: 30, align: 'right' },
      ];

  const RH = 6.5; // row height

  // Table header
  setFill(C.bg);
  doc.rect(M, y, CW, RH + 1, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  setColor(C.dark);

  let cx = M;
  cols.forEach(col => {
    const xp = col.align === 'right' ? cx + col.w - 2 : cx + 2;
    txt(col.label, xp, y + 4.5, { align: col.align });
    cx += col.w;
  });

  drawLine(M, y + RH + 1, W - M, y + RH + 1);
  y += RH + 1.5;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  setColor(C.black);

  data.items.forEach((item) => {
    cx = M;
    const vals: string[] = showGst
      ? [
          item.sr.toString(),
          item.productName.substring(0, 22),
          (item.variant || '-').substring(0, 14),
          item.hsn || '-',
          item.qty.toString(),
          fmtCur(item.rate),
          fmtCur(item.discount),
          fmtCur(item.taxableValue),
          `${item.gstPercent}%`,
          fmtCur(item.lineTotal),
        ]
      : [
          item.sr.toString(),
          item.productName.substring(0, 30),
          (item.variant || '-').substring(0, 18),
          item.qty.toString(),
          fmtCur(item.rate),
          fmtCur(item.discount),
          fmtCur(item.lineTotal),
        ];

    vals.forEach((val, i) => {
      const col = cols[i];
      const xp = col.align === 'right' ? cx + col.w - 2 : cx + 2;
      txt(val, xp, y + 4.5, { align: col.align });
      cx += col.w;
    });

    y += RH;
    // Light row separator
    drawLine(M, y, W - M, y, { r: 235, g: 235, b: 235 });
    y += 0.5;
  });

  y += 3;
  drawLine(M, y, W - M, y, C.light);
  y += 5;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TOTALS — right-aligned box
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const totalsX = W - M - 80;
  const totalsR = W - M;
  doc.setFontSize(7.5);

  const totalsRows: [string, string, boolean?][] = [
    ['Subtotal', `₹ ${fmtCur(data.subtotal)}`],
  ];
  if (data.discountTotal > 0) totalsRows.push(['Discount', `- ₹ ${fmtCur(data.discountTotal)}`]);
  if (showGst) {
    if (data.cgst > 0) totalsRows.push([`CGST${data.cgstRate ? ` @ ${data.cgstRate}%` : ''}`, `₹ ${fmtCur(data.cgst)}`]);
    if (data.sgst > 0) totalsRows.push([`SGST${data.sgstRate ? ` @ ${data.sgstRate}%` : ''}`, `₹ ${fmtCur(data.sgst)}`]);
    if (data.igst > 0) totalsRows.push([`IGST${data.igstRate ? ` @ ${data.igstRate}%` : ''}`, `₹ ${fmtCur(data.igst)}`]);
    if (data.cess > 0) totalsRows.push([`CESS${data.cessRate ? ` @ ${data.cessRate}%` : ''}`, `₹ ${fmtCur(data.cess)}`]);
  }
  if (data.shippingFee > 0) totalsRows.push(['Shipping / Handling', `₹ ${fmtCur(data.shippingFee)}`]);
  if (data.roundOff !== 0) totalsRows.push(['Round-off', `₹ ${fmtCur(data.roundOff)}`]);

  doc.setFont('helvetica', 'normal');
  setColor(C.dark);
  totalsRows.forEach(([label, val]) => {
    txt(label, totalsX, y);
    txt(val, totalsR, y, { align: 'right' });
    y += 4.5;
  });

  // Grand total
  y += 1;
  drawLine(totalsX, y, totalsR, y, C.dark);
  y += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  setColor(C.black);
  txt('Grand Total', totalsX, y);
  txt(`₹ ${fmtCur(data.grandTotal)}`, totalsR, y, { align: 'right' });
  y += 6;

  // Amount in words
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  setColor(C.mid);
  txt(numberToWords(Math.round(data.grandTotal)), M, y);
  y += 7;

  drawLine(M, y, W - M, y, C.light);
  y += 5;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BANK / PAYMENT DETAILS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const hasBankDetails = data.store.bankName && data.store.accountNumber;

  if (hasBankDetails) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    setColor(C.dark);
    txt('BANK DETAILS', M, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    if (data.store.accountHolder) { txt(`Account Name: ${data.store.accountHolder}`, M, y); y += 3.5; }
    txt(`Account No: ${data.store.accountNumber}`, M, y); y += 3.5;
    txt(`Bank: ${data.store.bankName}`, M, y); y += 3.5;
    if (data.store.ifscCode) { txt(`IFSC: ${data.store.ifscCode}`, M, y); y += 3.5; }
    if (data.store.upiId) { txt(`UPI: ${data.store.upiId}`, M, y); y += 3.5; }
    y += 3;
  }

  // Payment status line
  doc.setFontSize(7);
  setColor(C.mid);
  if (data.paymentMode && data.paymentMode.toLowerCase() !== 'cod') {
    txt(`Payment received via ${data.paymentMode}`, M, y);
  } else {
    txt('Payment pending / Collect COD', M, y);
  }
  y += 6;

  drawLine(M, y, W - M, y, C.light);
  y += 5;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TERMS & CONDITIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  setColor(C.dark);
  txt('Terms & Conditions', M, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  setColor(C.mid);

  const terms: string[] = [];
  if (data.store.returnPolicy) {
    terms.push(data.store.returnPolicy);
  } else {
    terms.push('Returns/exchanges accepted within 7 days of delivery, subject to item condition.');
  }
  if (data.store.termsAndConditions) {
    terms.push(data.store.termsAndConditions);
  }
  const jurisdiction = data.store.stateName || 'local';
  terms.push(`All disputes subject to ${jurisdiction} jurisdiction.`);

  terms.forEach((t, i) => {
    const wrapped = doc.splitTextToSize(`${i + 1}. ${t}`, CW);
    doc.text(wrapped, M, y);
    y += wrapped.length * 3.2;
  });

  y += 4;

  // Footer
  doc.setFontSize(6);
  setColor(C.mid);
  txt(`Goods sold by ${data.store.name}. SeeCen is a platform facilitator.`, M, y);
  y += 3;
  txt('This is a computer-generated invoice.', M, y);
  if (data.store.footerNotes) {
    y += 3;
    txt(data.store.footerNotes, M, y);
  }

  // Authorized signatory
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  setColor(C.dark);
  txt(`For ${data.store.name}`, rx - 5, H - M - 14, { align: 'right' });
  doc.setFontSize(6);
  txt('Authorised Signatory', rx - 5, H - M - 8, { align: 'right' });

  return doc;
}

// ─── Legacy adapter for backward compat ────────────────────────────

export interface LegacyInvoiceData {
  orderNumber: string;
  invoiceNumber?: string;
  invoiceDate: Date;
  customer: InvoiceCustomer;
  shippingAddress?: string | null;
  items: { name: string; hsn?: string; uom?: string; quantity: number; rate: number; discount?: number; variant?: string; sku?: string }[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst?: number;
  cess?: number;
  packingCharges?: number;
  total: number;
  storeName?: string;
  storeState?: string;
  storeStateCode?: string;
  placeOfSupplyState?: string;
  placeOfSupplyCode?: string;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  cessRate?: number;
  channel?: string;
  paymentMode?: string;
  paymentStatus?: string;
  store?: InvoiceStore;
}

/** @deprecated Use generateClozzetInvoice directly */
export function generateTaxInvoice(data: LegacyInvoiceData): jsPDF {
  const gstRate = (data.cgstRate || 0) + (data.sgstRate || 0);
  const roundOff = Math.round(data.total) - data.total;

  const store: InvoiceStore = data.store || {
    name: data.storeName || 'Store',
    stateName: data.storeState,
    stateCode: data.storeStateCode,
  };

  const invoiceData: InvoiceData = {
    invoiceNumber: data.invoiceNumber,
    invoiceDate: data.invoiceDate,
    orderNumber: data.orderNumber,
    channel: data.channel || 'in_store',
    paymentMode: data.paymentMode || '-',
    paymentStatus: data.paymentStatus || 'Confirmed',
    customer: data.customer,
    shippingAddress: data.shippingAddress,
    placeOfSupplyState: data.placeOfSupplyState || data.customer.state,
    placeOfSupplyCode: data.placeOfSupplyCode || data.customer.stateCode,
    items: data.items.map((item, i) => {
      const taxable = item.quantity * item.rate - (item.discount || 0);
      const cgst = taxable * ((data.cgstRate || 0) / 100);
      const sgst = taxable * ((data.sgstRate || 0) / 100);
      const igst = taxable * ((data.igstRate || 0) / 100);
      return {
        sr: i + 1,
        productName: item.name,
        variant: item.variant || '-',
        sku: item.sku,
        hsn: item.hsn,
        qty: item.quantity,
        rate: item.rate,
        discount: item.discount || 0,
        taxableValue: taxable,
        gstPercent: gstRate,
        cgst, sgst, igst,
        lineTotal: taxable + cgst + sgst + igst,
      };
    }),
    subtotal: data.subtotal,
    discountTotal: 0,
    cgst: data.cgst,
    sgst: data.sgst,
    igst: data.igst || 0,
    cess: data.cess || 0,
    shippingFee: data.packingCharges || 0,
    roundOff,
    grandTotal: Math.round(data.total),
    store,
    cgstRate: data.cgstRate,
    sgstRate: data.sgstRate,
    igstRate: data.igstRate,
    cessRate: data.cessRate,
  };

  return generateClozzetInvoice(invoiceData);
}

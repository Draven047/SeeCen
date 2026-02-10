import jsPDF from 'jspdf';

interface InvoiceItem {
  name: string;
  hsn?: string;
  uom?: string;
  quantity: number;
  rate: number;
  discount?: number;
}

interface InvoiceCustomer {
  name: string;
  phone?: string | null;
  address?: string | null;
  gstin?: string | null;
  state?: string;
  stateCode?: string;
}

export interface InvoiceData {
  orderNumber: string;
  invoiceNumber?: string;
  invoiceDate: Date;
  customer: InvoiceCustomer;
  shippingAddress?: string | null;
  items: InvoiceItem[];
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
}

// Company Info - can be configured
const COMPANY = {
  name: 'Cigar Conexion',
  legalName: 'Intabac India Pvt. Ltd',
  address: '123 Business Park, Sector 5',
  city: 'Mumbai',
  pincode: '400001',
  state: 'Maharashtra',
  stateCode: '27',
  email: 'sales@cigarconexion.com',
  phone: '+91 9876543210',
  gstin: '27AABCI1234F1Z5',
  bankDetails: {
    accountNo: '1234567890123456',
    accountName: 'Intabac India Pvt. Ltd',
    bankName: 'HDFC Bank',
    branchName: 'Mumbai Main Branch',
    ifsc: 'HDFC0001234'
  }
};

const TERMS = [
  'Goods once sold will not be taken back or exchanged.',
  'All disputes subject to Mumbai jurisdiction only.',
  'Please retain this invoice for warranty claims.',
  'For support, call our customer care: +91 9876543210'
];

// Convert number to words for Indian currency
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  };

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.floor(num % 1000);

  let result = '';
  if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
  if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
  if (remainder > 0) result += convertLessThanThousand(remainder);

  return result.trim() + ' Rupees Only';
}

function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateTaxInvoice(data: InvoiceData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 8;
  const contentWidth = pageWidth - (margin * 2);
  
  // Colors
  const grey = { r: 128, g: 128, b: 128 };
  const headerGrey = { r: 220, g: 220, b: 220 };
  const black = { r: 0, g: 0, b: 0 };
  const darkGrey = { r: 60, g: 60, b: 60 };
  
  let y = margin;
  
  // ========== OUTER BORDER ==========
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2));
  
  // ========== HEADER BLOCK ==========
  const headerHeight = 28;
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, headerHeight);
  
  // Left: Company Logo/Name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGrey.r, darkGrey.g, darkGrey.b);
  doc.text(COMPANY.name, margin + 5, y + 12);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grey.r, grey.g, grey.b);
  doc.text('Premium Cigar Distribution', margin + 5, y + 18);
  
  // Right: Company Details
  const rightX = pageWidth - margin - 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(black.r, black.g, black.b);
  doc.text(COMPANY.legalName, rightX, y + 6, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(darkGrey.r, darkGrey.g, darkGrey.b);
  doc.text(`${COMPANY.address}, ${COMPANY.city} - ${COMPANY.pincode}, ${COMPANY.state}`, rightX, y + 11, { align: 'right' });
  doc.text(`Email: ${COMPANY.email} | Phone: ${COMPANY.phone}`, rightX, y + 16, { align: 'right' });
  doc.text(`GSTIN: ${COMPANY.gstin}`, rightX, y + 21, { align: 'right' });
  
  y += headerHeight;
  
  // ========== TAX INVOICE TITLE ==========
  const titleHeight = 10;
  doc.setFillColor(headerGrey.r, headerGrey.g, headerGrey.b);
  doc.rect(margin, y, contentWidth, titleHeight, 'F');
  doc.rect(margin, y, contentWidth, titleHeight);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(black.r, black.g, black.b);
  doc.text('Tax Invoice', pageWidth / 2, y + 7, { align: 'center' });
  if (data.invoiceNumber) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice No: ${data.invoiceNumber}`, pageWidth - margin - 5, y + 7, { align: 'right' });
  }
  
  y += titleHeight;
  
  // ========== INVOICE META SECTION (2 side-by-side boxes) ==========
  const metaHeight = 22;
  const metaWidth = contentWidth / 2;
  
  // Left Meta Box
  doc.rect(margin, y, metaWidth, metaHeight);
  let metaY = y + 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice Number: ${data.invoiceNumber || data.orderNumber}`, margin + 3, metaY);
  metaY += 5;
  doc.text(`Invoice Date: ${formatDate(data.invoiceDate)}`, margin + 3, metaY);
  metaY += 5;
  doc.text(`State: ${COMPANY.state} (${COMPANY.stateCode})`, margin + 3, metaY);
  
  // Right Meta Box
  doc.rect(margin + metaWidth, y, metaWidth, metaHeight);
  metaY = y + 5;
  doc.text('Transportation Mode: -', margin + metaWidth + 3, metaY);
  metaY += 5;
  const supplyState = data.placeOfSupplyState || data.customer.state || COMPANY.state;
  const supplyCode = data.placeOfSupplyCode || data.customer.stateCode || COMPANY.stateCode;
  doc.text(`Place of Supply: ${supplyState} (${supplyCode})`, margin + metaWidth + 3, metaY);
  metaY += 5;
  doc.text('E-Way Bill No: -', margin + metaWidth + 3, metaY);
  
  y += metaHeight;
  
  // ========== BILLED TO / SHIPPED TO (2 side-by-side boxes) ==========
  const addressHeight = 32;
  const addressHeaderHeight = 6;
  
  // Left: Billed To
  doc.setFillColor(headerGrey.r, headerGrey.g, headerGrey.b);
  doc.rect(margin, y, metaWidth, addressHeaderHeight, 'F');
  doc.rect(margin, y, metaWidth, addressHeaderHeight);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Billed To :', margin + 3, y + 4.5);
  
  doc.rect(margin, y + addressHeaderHeight, metaWidth, addressHeight - addressHeaderHeight);
  let addrY = y + addressHeaderHeight + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(data.customer.name, margin + 3, addrY);
  addrY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  if (data.customer.phone) {
    doc.text(`Mobile: ${data.customer.phone}`, margin + 3, addrY);
    addrY += 4;
  }
  if (data.customer.address) {
    const addressLines = doc.splitTextToSize(data.customer.address, metaWidth - 6);
    doc.text(addressLines.slice(0, 2), margin + 3, addrY);
    addrY += addressLines.length > 1 ? 8 : 4;
  }
  doc.text(`GSTIN: ${data.customer.gstin || '-'}`, margin + 3, addrY);
  addrY += 4;
  doc.text(`State: ${data.customer.state || COMPANY.state} (${data.customer.stateCode || COMPANY.stateCode})`, margin + 3, addrY);
  
  // Right: Shipped To
  doc.setFillColor(headerGrey.r, headerGrey.g, headerGrey.b);
  doc.rect(margin + metaWidth, y, metaWidth, addressHeaderHeight, 'F');
  doc.rect(margin + metaWidth, y, metaWidth, addressHeaderHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Shipped To :', margin + metaWidth + 3, y + 4.5);
  
  doc.rect(margin + metaWidth, y + addressHeaderHeight, metaWidth, addressHeight - addressHeaderHeight);
  addrY = y + addressHeaderHeight + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(data.customer.name, margin + metaWidth + 3, addrY);
  addrY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const shipAddr = data.shippingAddress || data.customer.address;
  if (shipAddr) {
    const shipLines = doc.splitTextToSize(shipAddr, metaWidth - 6);
    doc.text(shipLines.slice(0, 3), margin + metaWidth + 3, addrY);
    addrY += shipLines.length > 2 ? 12 : shipLines.length > 1 ? 8 : 4;
  }
  doc.text(`State: ${data.customer.state || COMPANY.state} (${data.customer.stateCode || COMPANY.stateCode})`, margin + metaWidth + 3, addrY);
  
  y += addressHeight;
  
  // ========== ITEMS TABLE ==========
  const tableHeaderHeight = 8;
  const rowHeight = 7;
  // Adjusted column widths: Sr, Name, HSN, UOM, Qty, Rate, Amount, Disc, Total
  const colWidths = [10, 50, 16, 12, 12, 24, 26, 20, 24]; 
  
  // Table Header
  doc.setFillColor(headerGrey.r, headerGrey.g, headerGrey.b);
  doc.rect(margin, y, contentWidth, tableHeaderHeight, 'F');
  doc.rect(margin, y, contentWidth, tableHeaderHeight);
  
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(black.r, black.g, black.b);
  
  let colX = margin;
  const headers = ['Sr', 'Name of Product', 'HSN', 'UOM', 'Qty', 'Rate', 'Amount', 'Disc.', 'Total'];
  headers.forEach((header, i) => {
    const align = i >= 4 ? 'right' : 'left';
    const xPos = align === 'right' ? colX + colWidths[i] - 2 : colX + 2;
    doc.text(header, xPos, y + 5.5, { align });
    colX += colWidths[i];
    if (i < headers.length - 1) {
      doc.line(colX, y, colX, y + tableHeaderHeight);
    }
  });
  
  y += tableHeaderHeight;
  
  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(darkGrey.r, darkGrey.g, darkGrey.b);
  
  let totalQty = 0;
  let totalAmount = 0;
  let totalDiscount = 0;
  let totalLineTotal = 0;
  
  // Helper to format currency compactly for table cells
  const formatTableCurrency = (amount: number, maxWidth: number): string => {
    const formatted = formatCurrency(amount);
    // If the number is very large, use compact format
    if (formatted.length > 10) {
      if (amount >= 10000000) {
        return (amount / 10000000).toFixed(2) + 'Cr';
      } else if (amount >= 100000) {
        return (amount / 100000).toFixed(2) + 'L';
      }
    }
    return formatted;
  };
  
  data.items.forEach((item, index) => {
    const amount = item.quantity * item.rate;
    const discount = item.discount || 0;
    const lineTotal = amount - discount;
    
    totalQty += item.quantity;
    totalAmount += amount;
    totalDiscount += discount;
    totalLineTotal += lineTotal;
    
    doc.rect(margin, y, contentWidth, rowHeight);
    
    colX = margin;
    const values = [
      (index + 1).toString(),
      item.name.substring(0, 24),
      item.hsn || '24021010',
      item.uom || 'Pcs',
      item.quantity.toString(),
      formatTableCurrency(item.rate, colWidths[5]),
      formatTableCurrency(amount, colWidths[6]),
      formatTableCurrency(discount, colWidths[7]),
      formatTableCurrency(lineTotal, colWidths[8])
    ];
    
    values.forEach((val, i) => {
      const align = i >= 4 ? 'right' : 'left';
      const xPos = align === 'right' ? colX + colWidths[i] - 2 : colX + 2;
      doc.text(val, xPos, y + 5, { align });
      colX += colWidths[i];
      if (i < values.length - 1) {
        doc.line(colX, y, colX, y + rowHeight);
      }
    });
    
    y += rowHeight;
  });
  
  // Totals Row
  doc.setFillColor(headerGrey.r, headerGrey.g, headerGrey.b);
  doc.rect(margin, y, contentWidth, rowHeight, 'F');
  doc.rect(margin, y, contentWidth, rowHeight);
  
  doc.setFont('helvetica', 'bold');
  colX = margin;
  const totalsRow = [
    '', 'Total', '', '', totalQty.toString(), '', 
    formatTableCurrency(totalAmount, colWidths[6]), 
    formatTableCurrency(totalDiscount, colWidths[7]), 
    formatTableCurrency(totalLineTotal, colWidths[8])
  ];
  
  totalsRow.forEach((val, i) => {
    const align = i >= 4 ? 'right' : 'left';
    const xPos = align === 'right' ? colX + colWidths[i] - 2 : colX + 2;
    if (val) doc.text(val, xPos, y + 5, { align });
    colX += colWidths[i];
    if (i < totalsRow.length - 1) {
      doc.line(colX, y, colX, y + rowHeight);
    }
  });
  
  y += rowHeight;
  
  // ========== BOTTOM SUMMARY AREA ==========
  const summaryHeight = 50;
  const leftSummaryWidth = contentWidth * 0.55;
  const rightSummaryWidth = contentWidth - leftSummaryWidth;
  
  // Left Column: Amount in Words + Bank Details
  doc.rect(margin, y, leftSummaryWidth, summaryHeight);
  
  let leftY = y + 5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Invoice Amount in Words:', margin + 3, leftY);
  leftY += 4;
  doc.setFont('helvetica', 'normal');
  const amountWords = numberToWords(Math.round(data.total));
  const wordLines = doc.splitTextToSize(amountWords, leftSummaryWidth - 6);
  doc.text(wordLines, margin + 3, leftY);
  leftY += wordLines.length * 3 + 4;
  
  // Bank Details Box
  doc.setFont('helvetica', 'bold');
  doc.text('BANK DETAILS', margin + 3, leftY);
  leftY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`Bank Account No.: ${COMPANY.bankDetails.accountNo}`, margin + 3, leftY);
  leftY += 3.5;
  doc.text(`Account Name: ${COMPANY.bankDetails.accountName}`, margin + 3, leftY);
  leftY += 3.5;
  doc.text(`Bank Name: ${COMPANY.bankDetails.bankName}`, margin + 3, leftY);
  leftY += 3.5;
  doc.text(`Branch Name: ${COMPANY.bankDetails.branchName}`, margin + 3, leftY);
  leftY += 3.5;
  doc.text(`IFSC Code: ${COMPANY.bankDetails.ifsc}`, margin + 3, leftY);
  
  // Right Column: Tax Breakdown
  doc.rect(margin + leftSummaryWidth, y, rightSummaryWidth, summaryHeight);
  
  let rightY = y + 5;
  const rightX2 = pageWidth - margin - 5;
  const labelX = margin + leftSummaryWidth + 3;
  doc.setFontSize(6.5);
  
  // Helper to format currency compactly for summary section
  const formatSummaryCurrency = (amount: number): string => {
    const absAmount = Math.abs(amount);
    if (absAmount >= 10000000) {
      return (amount / 10000000).toFixed(2) + ' Cr';
    } else if (absAmount >= 100000) {
      return (amount / 100000).toFixed(2) + ' L';
    }
    return formatCurrency(amount);
  };
  
  const cgstLabel = data.cgstRate ? `CGST @ ${data.cgstRate}%` : 'CGST';
  const sgstLabel = data.sgstRate ? `SGST @ ${data.sgstRate}%` : 'SGST';
  const igstLabel = data.igstRate ? `IGST @ ${data.igstRate}%` : 'IGST';
  const cessLabel = data.cessRate ? `CESS @ ${data.cessRate}%` : 'CESS';

  const taxRows = [
    ['Amount Before Tax', formatSummaryCurrency(data.subtotal)],
    [cgstLabel, formatSummaryCurrency(data.cgst)],
    [sgstLabel, formatSummaryCurrency(data.sgst)],
    [igstLabel, formatSummaryCurrency(data.igst || 0)],
    [cessLabel, formatSummaryCurrency(data.cess || 0)],
    ['Total GST', formatSummaryCurrency(data.cgst + data.sgst + (data.igst || 0) + (data.cess || 0))],
    ['Packing & Shipping', formatSummaryCurrency(data.packingCharges || 0)],
    ['Round-off', formatCurrency(Math.round(data.total) - data.total)],
  ];
  
  doc.setFont('helvetica', 'normal');
  taxRows.forEach(([label, value]) => {
    doc.text(label, labelX, rightY);
    doc.text(value, rightX2, rightY, { align: 'right' });
    rightY += 4.5;
  });
  
  // Grand Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  rightY += 1;
  doc.text('Total', labelX, rightY);
  doc.text(`₹ ${formatSummaryCurrency(Math.round(data.total))}`, rightX2, rightY, { align: 'right' });
  
  y += summaryHeight;
  
  // ========== TERMS & CONDITIONS + SIGNATORY ==========
  const footerHeight = pageHeight - margin - y;
  doc.rect(margin, y, contentWidth, footerHeight);
  
  // Terms on left
  let termsY = y + 5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions:', margin + 3, termsY);
  termsY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  TERMS.forEach((term, i) => {
    doc.text(`${i + 1}. ${term}`, margin + 3, termsY);
    termsY += 3.5;
  });
  
  // Authorized Signatory on right
  const signX = pageWidth - margin - 40;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`For ${COMPANY.legalName}`, signX, y + 10);
  doc.setFontSize(6);
  doc.text('Authorised Signatory', signX, y + footerHeight - 8);
  
  // Thank you line at bottom center
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(grey.r, grey.g, grey.b);
  doc.text('Thank You Visit Again', pageWidth / 2, pageHeight - margin - 3, { align: 'center' });
  
  return doc;
}

export type { InvoiceItem, InvoiceCustomer };

// Indian States with GST State Codes
export const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
] as const;

export type StateCode = typeof INDIAN_STATES[number]['code'];

export function getStateByCode(code: string) {
  return INDIAN_STATES.find(s => s.code === code);
}

export function getStateByName(name: string) {
  return INDIAN_STATES.find(s => s.name.toLowerCase() === name.toLowerCase());
}

// Determine if transaction is inter-state
export function isInterState(storeStateCode: string, supplyStateCode: string): boolean {
  return storeStateCode !== supplyStateCode;
}

// Calculate tax breakdown based on inter-state logic
export interface TaxCalculation {
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalTax: number;
}

export function calculateTax(
  subtotal: number,
  storeStateCode: string,
  supplyStateCode: string,
  defaultCgstRate: number,
  defaultSgstRate: number,
  defaultIgstRate: number,
  cessRate: number = 0,
  cessEnabled: boolean = false
): TaxCalculation {
  const isInterStateTx = isInterState(storeStateCode, supplyStateCode);
  const cessAmount = cessEnabled ? (subtotal * cessRate) / 100 : 0;
  
  if (isInterStateTx) {
    // Inter-state: Apply IGST only
    const igstAmount = (subtotal * defaultIgstRate) / 100;
    return {
      cgstRate: 0,
      sgstRate: 0,
      igstRate: defaultIgstRate,
      cessRate: cessEnabled ? cessRate : 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount,
      cessAmount,
      totalTax: igstAmount + cessAmount
    };
  } else {
    // Intra-state: Apply CGST + SGST
    const cgstAmount = (subtotal * defaultCgstRate) / 100;
    const sgstAmount = (subtotal * defaultSgstRate) / 100;
    return {
      cgstRate: defaultCgstRate,
      sgstRate: defaultSgstRate,
      igstRate: 0,
      cessRate: cessEnabled ? cessRate : 0,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
      cessAmount,
      totalTax: cgstAmount + sgstAmount + cessAmount
    };
  }
}

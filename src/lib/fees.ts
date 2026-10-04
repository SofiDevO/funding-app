export const LS_FEE_RATE = 0.05;  // 5%
export const LS_FEE_FIXED = 0.50; // $0.50 fixed

/**
 * Calculates the gross amount the donor must pay so the creator receives exactly `net`.
 * Formula: ceil(((net + 0.50) / 0.95) * 100) / 100
 */
export function grossUpFees(net: number): number {
  return Math.ceil(((net + LS_FEE_FIXED) / (1 - LS_FEE_RATE)) * 100) / 100;
}

/**
 * Returns only the fee portion for a given net amount.
 */
export function calcFee(net: number): number {
  return grossUpFees(net) - net;
}

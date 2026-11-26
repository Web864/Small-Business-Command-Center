// Pricing Lab maths. Pure functions so the formulas can be unit-tested without a browser.
// The original formula is preserved: price = (cost + packaging + shipping + target contribution + fixed fee) / (1 - fee%).
export type PricingInputs = { pack: string; ship: string; desired: string; fee: string; fixed: string };
export type PricingField = keyof PricingInputs;
export type PricingResult = {
  errors: Partial<Record<PricingField, string>>;
  warnings: string[];
  valid: boolean;
  price: number | null;          // suggested minimum selling price (rounded UP to the next cent)
  baseCost: number | null;       // product cost + packaging + shipping
  feeAmount: number | null;      // percentage fee + fixed fee charged on the suggested price
  contribution: number | null;   // price - baseCost - feeAmount
  marginPct: number | null;      // contribution / price
  markupPct: number | null;      // contribution / baseCost (null when baseCost is 0)
};
export const FEE_MAX = 99.99;
export const MONEY_MAX = 1000000000;
export const PRICING_LABELS: Record<PricingField, string> = {
  pack: 'Packaging', ship: 'Shipping', desired: 'Desired contribution', fee: 'Percentage fee', fixed: 'Fixed fee',
};
export const DEFAULT_PRICING: PricingInputs = { pack: '2', ship: '3', desired: '10', fee: '6.5', fixed: '0.3' };

/** Parses a decimal text value; returns null for blank/non-numeric input (never NaN/Infinity). */
export function parseDecimal(raw: string): number | null {
  const text = (raw ?? '').trim();
  if (text === '' || !/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
/** Round UP to a whole cent, ignoring binary floating-point noise (e.g. 10.000000000000002 -> 10.00). */
export function ceilCents(value: number): number {
  return Math.ceil(Math.round(value * 100 * 1e6) / 1e6) / 100;
}
export function roundCents(value: number): number { return Math.round(value * 100 + (value < 0 ? -1e-9 : 1e-9)) / 100; }

export function calculatePricing(inputs: PricingInputs, productCost: number | null, currentPrice: number | null = null): PricingResult {
  const errors: PricingResult['errors'] = {};
  const warnings: string[] = [];
  const values = {} as Record<PricingField, number>;
  (Object.keys(PRICING_LABELS) as PricingField[]).forEach(field => {
    const parsed = parseDecimal(inputs[field]);
    const label = PRICING_LABELS[field];
    if (parsed === null) { errors[field] = label + ' must be a number (use 0 if none).'; return; }
    if (parsed < 0) { errors[field] = label + ' cannot be negative.'; return; }
    if (field === 'fee' && parsed > FEE_MAX) { errors[field] = 'Percentage fee must be below 100% (maximum ' + FEE_MAX + '%).'; return; }
    if (field !== 'fee' && parsed > MONEY_MAX) { errors[field] = label + ' is too large.'; return; }
    if (Math.abs(parsed * 100 - Math.round(parsed * 100)) > 0.0001 && field !== 'fee') { errors[field] = label + ' can have at most 2 decimal places.'; return; }
    values[field] = parsed;
  });
  const empty: PricingResult = { errors, warnings, valid: false, price: null, baseCost: null, feeAmount: null, contribution: null, marginPct: null, markupPct: null };
  if (productCost === null || !Number.isFinite(productCost) || productCost < 0) {
    warnings.push('Choose a product to include its unit cost.');
    return empty;
  }
  if (Object.keys(errors).length) return empty;
  if (values.fee > 30) warnings.push('A ' + values.fee + '% percentage fee is unusually high. Marketplace fees are typically below 30% — check this value.');
  if (values.fee === 0 && values.fixed === 0) warnings.push('No platform fees entered. Add marketplace or payment fees if you sell through one.');
  const baseCost = productCost + values.pack + values.ship;
  const price = ceilCents((baseCost + values.desired + values.fixed) / (1 - values.fee / 100));
  if (!Number.isFinite(price)) return empty;
  const feeAmount = roundCents(price * values.fee / 100 + values.fixed);
  const contribution = roundCents(price - baseCost - feeAmount);
  const marginPct = price > 0 ? contribution / price * 100 : null;
  const markupPct = baseCost > 0 ? contribution / baseCost * 100 : null;
  if (price === 0) warnings.push('All costs and the target contribution are zero, so the suggested price is zero.');
  if (currentPrice !== null && Number.isFinite(currentPrice)) {
    if (productCost + values.pack + values.ship >= currentPrice) {
      warnings.push('Your costs (' + roundCents(baseCost).toFixed(2) + ') are at or above the product\'s current selling price (' + roundCents(currentPrice).toFixed(2) + ').');
    } else if (currentPrice + 0.0001 < price) {
      warnings.push('The product\'s current selling price (' + roundCents(currentPrice).toFixed(2) + ') is below the suggested minimum (' + price.toFixed(2) + ').');
    }
  }
  return { errors, warnings, valid: true, price, baseCost: roundCents(baseCost), feeAmount, contribution, marginPct, markupPct };
}
/** Scales every money input by an exchange rate (percentage fee is unchanged). */
export function scalePricingInputs(inputs: PricingInputs, rate: number): PricingInputs {
  if (!Number.isFinite(rate) || rate <= 0) return inputs;
  const scale = (raw: string) => { const v = parseDecimal(raw); return v === null ? raw : String(Math.round(v * rate * 100) / 100); };
  return { ...inputs, pack: scale(inputs.pack), ship: scale(inputs.ship), desired: scale(inputs.desired), fixed: scale(inputs.fixed) };
}

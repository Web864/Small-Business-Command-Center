// Inventory arithmetic shared by the Products page, the order form and the stock validation (pure, deterministic).
export type StockLine = { productId: string; qty: number };
export type StockOrder = { id: string; status: string; items?: StockLine[]; productId?: string; qty?: number };
export const orderLines = (o: StockOrder): StockLine[] =>
  o.items && o.items.length ? o.items : (o.productId ? [{ productId: o.productId, qty: o.qty || 0 }] : []);
/** Units of a product reserved by orders. Cancelled orders release their stock; every other status reserves it. */
export function reservedUnits(orders: StockOrder[], productId: string, excludeOrderId?: string): number {
  return orders.filter(o => o.status !== 'Cancelled' && o.id !== excludeOrderId)
    .reduce((sum, o) => sum + orderLines(o).filter(l => l.productId === productId).reduce((q, l) => q + l.qty, 0), 0);
}
/** Stock on hand minus reserved units (what the Products page shows). */
export const availableUnits = (stock: number, orders: StockOrder[], productId: string): number => stock - reservedUnits(orders, productId);
/**
 * Units this order may still take. When editing an order its own lines are not "reserved against itself": this is the
 * number the save validation enforces, so the picker must show the same figure.
 */
export function availableForOrder(stock: number, orders: StockOrder[], productId: string, editingOrderId?: string | null): number {
  const editing = editingOrderId ? orders.find(o => o.id === editingOrderId) : undefined;
  return stock - reservedUnits(orders, productId, editing && editing.status !== 'Cancelled' ? editing.id : undefined);
}

// Path-based URLs for the signed-in app. Each menu item has its own real URL (/orders, /products, ...).
// These pages are private (login required) and are served with noindex; public marketing pages live in Laravel.
export const PAGE_PATHS: Record<string, string> = {
  'Dashboard': '/dashboard',
  'Orders': '/orders',
  'Products': '/products',
  'Customers': '/customers',
  'Expenses': '/expenses',
  'Content Planner': '/content-planner',
  'Pricing Lab': '/pricing-lab',
  'Profile': '/profile',
};
export const APP_PATHS: string[] = Object.values(PAGE_PATHS);
export const pathForPage = (page: string): string => PAGE_PATHS[page] ?? PAGE_PATHS.Dashboard;

const normalise = (pathname: string) => { const p = (pathname || '/').replace(/\/+$/, '').toLowerCase(); return p === '' ? '/' : p; };

/** Resolves a location to a page name. `legacy` is true for old `/#Orders` style links (caller should rewrite to the real path). */
export function resolveLocation(pathname: string, hash: string): { page: string | null; legacy: boolean } {
  const p = normalise(pathname);
  const byPath = Object.keys(PAGE_PATHS).find(name => PAGE_PATHS[name] === p);
  if (byPath) return { page: byPath, legacy: false };
  let raw = (hash || '').replace(/^#/, '');
  try { raw = decodeURIComponent(raw); } catch { /* keep raw */ }
  const byHash = Object.keys(PAGE_PATHS).find(name => name === raw);
  return byHash ? { page: byHash, legacy: true } : { page: null, legacy: false };
}

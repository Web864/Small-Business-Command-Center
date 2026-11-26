// Focus-trap helper (pure) used by the shared Dialog component.
export type FocusLike = { id?: string };
/** Returns the element that should receive focus after Tab / Shift+Tab, or null to let the browser move focus normally. */
export function nextTrappedFocus<T>(focusables: T[], active: T | null, shift: boolean): T | null {
  if (focusables.length === 0) return null;
  const first = focusables[0], last = focusables[focusables.length - 1];
  const index = active === null ? -1 : focusables.indexOf(active);
  if (index === -1) return shift ? last : first;       // focus escaped the dialog: pull it back in
  if (shift && active === first) return last;
  if (!shift && active === last) return first;
  return null;
}
export const FOCUSABLE_SELECTOR = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

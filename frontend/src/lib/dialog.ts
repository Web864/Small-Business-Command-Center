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

/**
 * Focus-restoration planning (R-01). After a dialog closes the opener may be (a) still there and usable,
 * (b) still there but temporarily disabled (a save/archive is in flight), or (c) gone (the list re-rendered, the
 * record moved to another view). The caller polls this until it returns something other than 'wait'.
 */
export type RestoreStep = 'focus-trigger' | 'wait' | 'focus-fallback' | 'focus-main';
export function decideRestore(input: { triggerConnected: boolean; triggerDisabled: boolean; fallbackAvailable: boolean; attempt: number; maxAttempts: number }): RestoreStep {
  const { triggerConnected, triggerDisabled, fallbackAvailable, attempt, maxAttempts } = input;
  if (triggerConnected && !triggerDisabled) return 'focus-trigger';
  if (triggerConnected && triggerDisabled) return attempt < maxAttempts ? 'wait' : (fallbackAvailable ? 'focus-fallback' : 'focus-main');
  return fallbackAvailable ? 'focus-fallback' : 'focus-main';
}
/** True when the user (or app) already placed focus on a real control, so we must not steal it. */
export function focusAlreadyPlaced(active: { tagName?: string } | null, isConnected: boolean): boolean {
  if (!active || !isConnected) return false;
  const tag = (active.tagName || '').toUpperCase();
  return tag !== '' && tag !== 'BODY' && tag !== 'HTML';
}

import { useEffect, useRef, type ReactNode } from 'react';
import { FOCUSABLE_SELECTOR, decideRestore, focusAlreadyPlaced, nextTrappedFocus, resolveOpener } from '../lib/dialog';

// Module-level stack so only the top-most dialog reacts to Escape/Tab (nested dialogs).
const stack: symbol[] = [];
const BACKGROUND_SELECTOR = '[data-app-background]';

type Opener = { el: HTMLElement | null; label: string; text: string; container: HTMLElement | null; order: number };
let openerSeq = 0;
const pending: Opener[] = [];
let flushing = false;
const isDisabled = (el: HTMLElement) => (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true';
const usable = (el: Element | null): el is HTMLElement => !!el && el.isConnected && !el.closest('[inert]');
function describe(el: HTMLElement | null): Opener {
  return { el, label: el?.getAttribute('aria-label') || '', text: (el?.textContent || '').trim().slice(0, 60),
    container: el ? (el.closest('.catalog-grid, .notes-grid, table, .panel, section') as HTMLElement | null) : null, order: openerSeq++ };
}
/** Re-finds an opener that React re-rendered into a new DOM node (same accessible name). */
function refind(o: Opener): HTMLElement | null {
  if (o.el && o.el.isConnected) return o.el;
  const scope: ParentNode = document.querySelector('main') || document;
  if (o.label) { const hit = Array.from(scope.querySelectorAll<HTMLElement>('[aria-label]')).find(e => e.getAttribute('aria-label') === o.label); if (hit) return hit; }
  if (o.text) { const hit = Array.from(scope.querySelectorAll<HTMLElement>('button')).find(e => (e.textContent || '').trim().slice(0, 60) === o.text); if (hit) return hit; }
  return null;
}
function firstControlIn(container: HTMLElement | null): HTMLElement | null {
  if (!container || !container.isConnected) return null;
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).find(e => usable(e) && !isDisabled(e)) || null;
}
function flushRestore(attempt = 0) {
  // Another dialog is still open (e.g. a confirm closed on top of the form): leave focus to that dialog's own trap.
  if (stack.length > 0) {
    const roots = document.querySelectorAll<HTMLElement>('[data-dialog-root]');
    const top = roots[roots.length - 1]?.querySelector<HTMLElement>('[role="dialog"],[role="alertdialog"]') || null;
    const last = pending[pending.length - 1];
    const back = last ? refind(last) : null;
    pending.length = 0; flushing = false;
    if (top && !top.contains(document.activeElement)) {
      const target = back && top.contains(back) && usable(back) && !isDisabled(back) ? back : firstControlIn(top) || top;
      target.focus();
    }
    return;
  }
  if (!pending.length) { flushing = false; return; }
  // Earliest-opened dialog's opener wins: closing a confirm + its form together returns to the control that opened the form.
  const sorted = [...pending].sort((a, b) => a.order - b.order);
  if (focusAlreadyPlaced(document.activeElement, document.activeElement?.isConnected ?? false) && !(document.activeElement as HTMLElement | null)?.closest('[data-dialog-root]')) {
    pending.length = 0; flushing = false; return;
  }
  const chosen = sorted.find(o => refind(o)) || sorted[0];
  const trigger = refind(chosen);
  const fallback = firstControlIn(chosen.container);
  const step = decideRestore({ triggerConnected: !!trigger && usable(trigger), triggerDisabled: !!trigger && isDisabled(trigger), fallbackAvailable: !!fallback, attempt, maxAttempts: 30 });
  if (step === 'wait') { window.setTimeout(() => flushRestore(attempt + 1), 50); return; }
  pending.length = 0; flushing = false;
  const main = document.getElementById('main-content');
  const target = step === 'focus-trigger' ? trigger : step === 'focus-fallback' ? fallback : main;
  target?.focus({ preventScroll: step === 'focus-main' });
}
/** Restore focus after a non-dialog action (e.g. Restore/Archive without a confirm) when the acting control may have unmounted. */
export function restoreFocusAfter(el: HTMLElement | null) { if (el) scheduleRestore(describe(el)); }
function scheduleRestore(opener: Opener) {
  pending.push(opener);
  if (!flushing) { flushing = true; window.setTimeout(() => flushRestore(0), 0); }
}

function setInert(el: Element, on: boolean) {
  if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
  else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
}
function syncBackground() {
  document.querySelectorAll(BACKGROUND_SELECTOR).forEach(el => setInert(el, stack.length > 0));
  // Nested dialogs: every dialog except the top-most one is inert.
  const roots = Array.from(document.querySelectorAll('[data-dialog-root]'));
  roots.forEach((el, i) => setInert(el, i < roots.length - 1));
}

export type DialogProps = {
  titleId: string;
  descId?: string;
  onClose: () => void;
  /** false = backdrop click does NOT dismiss (destructive confirms, forms with unsaved data). Escape still calls onClose. */
  backdropDismiss?: boolean;
  role?: 'dialog' | 'alertdialog';
  className?: string;
  backdropClassName?: string;
  initialFocusSelector?: string;
  children: ReactNode;
};

export function Dialog({ titleId, descId, onClose, backdropDismiss = true, role = 'dialog', className = 'modal', backdropClassName = 'modalback', initialFocusSelector, children }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const openerRef = useRef<Opener | null>(null);

  useEffect(() => {
    const token = Symbol('dialog');
    const node = ref.current;
    const active = document.activeElement as HTMLElement | null;
    const opener = resolveOpener<Opener>(openerRef.current, !!(node && active && node.contains(active)), describe(active));
    openerRef.current = opener;
    stack.push(token);
    queueMicrotask(syncBackground);
    const focusables = () => Array.from<HTMLElement>(node ? node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) : []).filter(el => el.offsetParent !== null || el === document.activeElement);
    const initial = (initialFocusSelector && node?.querySelector<HTMLElement>(initialFocusSelector)) || node?.querySelector<HTMLElement>('[data-autofocus]') || focusables()[0] || node;
    initial?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const list = focusables();
      if (!list.length) { event.preventDefault(); node?.focus(); return; }
      const target = nextTrappedFocus(list, document.activeElement as HTMLElement | null, event.shiftKey);
      if (target) { event.preventDefault(); target.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      const i = stack.indexOf(token);
      if (i >= 0) stack.splice(i, 1);
      syncBackground();
      // Restore focus to the opener; waits while it is disabled, re-finds it after a re-render, and falls back safely.
      scheduleRestore(opener);
    };
  }, [initialFocusSelector]);

  return (
    <div className={backdropClassName} data-dialog-root="" onMouseDown={event => { if (backdropDismiss && event.target === event.currentTarget) onClose(); }}>
      <div ref={ref} className={className} role={role} aria-modal="true" aria-labelledby={titleId} aria-describedby={descId} tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}

export function CloseButton({ onClick, label = 'Close dialog' }: { onClick: () => void; label?: string }) {
  return <button type="button" className="close" aria-label={label} onClick={onClick}><span aria-hidden="true">×</span></button>;
}

export type ConfirmState = { title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; cancelLabel?: string } | null;

export function ConfirmDialog({ state, onCancel }: { state: NonNullable<ConfirmState>; onCancel: () => void }) {
  return (
    <Dialog titleId="confirm-title" descId="confirm-desc" onClose={onCancel} backdropDismiss={false} role="alertdialog" className="modal confirm-dialog" initialFocusSelector="[data-cancel]">
      <div className="modalhead"><h2 id="confirm-title">{state.title}</h2><CloseButton onClick={onCancel} label="Cancel and close" /></div>
      <p id="confirm-desc" className="confirm-message">{state.message}</p>
      <div className="currency-actions">
        <button type="button" className="action-cancel" data-cancel onClick={onCancel}>{state.cancelLabel || 'Cancel'}</button>
        <button type="button" className={state.danger ? 'action-delete-confirm' : 'primary'} onClick={() => { const run = state.onConfirm; onCancel(); run(); }}>{state.confirmLabel}</button>
      </div>
    </Dialog>
  );
}

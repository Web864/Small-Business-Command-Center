import { useEffect, useRef, type ReactNode } from 'react';
import { FOCUSABLE_SELECTOR, nextTrappedFocus } from '../lib/dialog';

// Module-level stack so only the top-most dialog reacts to Escape/Tab (nested dialogs).
const stack: symbol[] = [];
const BACKGROUND_SELECTOR = '[data-app-background]';

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

  useEffect(() => {
    const token = Symbol('dialog');
    const trigger = document.activeElement as HTMLElement | null;
    stack.push(token);
    queueMicrotask(syncBackground);
    const node = ref.current;
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
      // Restore focus to the element that opened the dialog (if it is still on the page).
      if (trigger && document.contains(trigger) && typeof trigger.focus === 'function') setTimeout(() => trigger.focus(), 0);
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

// Page-change vs open-dialog policy (pure). Page-specific dialogs must not outlive the page that opened them.
export type PageChangeAction = 'none' | 'close' | 'revert-and-confirm';
export function decidePageChange(input: { previousPage: string; page: string; dialogOpen: boolean; dirty: boolean }): PageChangeAction {
  const { previousPage, page, dialogOpen, dirty } = input;
  if (previousPage === page || !dialogOpen) return 'none';
  return dirty ? 'revert-and-confirm' : 'close';
}

'use client';

// Hook for confirmation dialogs on destructive actions.
// Built on shadcn/ui AlertDialog.
//
// Usage:
//   const { confirm, ConfirmDialog } = useConfirm();
//
//   const handleDelete = async () => {
//     if (await confirm('Delete this item?', 'This action cannot be undone.')) {
//       await deleteItem(id);
//     }
//   };
//
//   return <><button onClick={handleDelete}>Delete</button><ConfirmDialog /></>;

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

type ResolveRef = ((value: boolean) => void) | null;

export function useConfirm() {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<ConfirmOptions>({});
  const resolveRef = React.useRef<ResolveRef>(null);

  const confirm = React.useCallback(
    (titleOrOpts?: string | ConfirmOptions, description?: string): Promise<boolean> => {
      const opts: ConfirmOptions =
        typeof titleOrOpts === 'string'
          ? { title: titleOrOpts, description }
          : titleOrOpts ?? {};

      setOptions(opts);
      setOpen(true);
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
      });
    },
    [],
  );

  const handleAction = React.useCallback((confirmed: boolean) => {
    setOpen(false);
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
  }, []);

  const ConfirmDialog = React.useCallback(
    () => (
      <AlertDialog open={open} onOpenChange={(v) => !v && handleAction(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title ?? 'Are you sure?'}</AlertDialogTitle>
            {options.description && (
              <AlertDialogDescription>{options.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleAction(false)}>
              {options.cancelLabel ?? 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction(true)}
              className={
                options.variant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : undefined
              }
            >
              {options.confirmLabel ?? 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
    [open, options, handleAction],
  );

  return { confirm, ConfirmDialog };
}

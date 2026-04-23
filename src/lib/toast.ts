// src/lib/toast.ts
// Unified toast helper built on Sonner.
// Auto-parses standardized API error responses.
//
// Usage:
//   import { toast } from '@/lib/toast';
//   toast.success('Saved!');
//   toast.error('Failed to delete');
//   toast.apiError(errorBody);     // parses { success: false, error: { code, message, details } }
//   toast.promise(promise, { loading, success, error });

import { toast as sonnerToast } from 'sonner';
import type { ApiErrorBody } from '@/lib/api/response';

export const toast = {
  success(message: string, description?: string) {
    sonnerToast.success(message, { description });
  },

  error(message: string, description?: string) {
    sonnerToast.error(message, { description });
  },

  info(message: string, description?: string) {
    sonnerToast.info(message, { description });
  },

  warning(message: string, description?: string) {
    sonnerToast.warning(message, { description });
  },

  /**
   * Parse and display an API error response.
   * Accepts the standardized error body: { success: false, error: { code, message, details? } }
   * Also handles plain Error objects and unknown shapes.
   */
  apiError(error: unknown) {
    // Standardized API error body
    if (isApiErrorBody(error)) {
      const details = formatDetails(error.error.details);
      sonnerToast.error(error.error.message, {
        description: details || `Error code: ${error.error.code}`,
      });
      return;
    }

    // Plain Error instance
    if (error instanceof Error) {
      sonnerToast.error(error.message);
      return;
    }

    // Object with message field
    if (typeof error === 'object' && error !== null && 'message' in error) {
      sonnerToast.error(String((error as { message: unknown }).message));
      return;
    }

    // Fallback
    sonnerToast.error('An unexpected error occurred');
  },

  /**
   * Promise toast — shows loading, then success or error.
   *
   *   toast.promise(saveData(), {
   *     loading: 'Saving...',
   *     success: 'Saved!',
   *     error: 'Failed to save',
   *   });
   */
  promise<T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
  ) {
    return sonnerToast.promise(promise, messages);
  },

  /** Dismiss a specific toast or all toasts. */
  dismiss(id?: string | number) {
    sonnerToast.dismiss(id);
  },
};

// ---- Helpers ----

function isApiErrorBody(val: unknown): val is ApiErrorBody {
  return (
    typeof val === 'object' &&
    val !== null &&
    'success' in val &&
    (val as { success: unknown }).success === false &&
    'error' in val &&
    typeof (val as { error: unknown }).error === 'object'
  );
}

function formatDetails(details: unknown): string | undefined {
  if (!details) return undefined;
  if (Array.isArray(details)) {
    return details
      .map((d: { field?: string; message?: string }) =>
        d.field ? `${d.field}: ${d.message}` : d.message,
      )
      .filter(Boolean)
      .join(', ');
  }
  return undefined;
}

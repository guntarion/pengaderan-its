'use client';

// Reusable form wrapper with react-hook-form + Zod + shadcn/ui.
// Handles loading state, server errors, and field-level validation.
//
// Usage:
//   const schema = z.object({ name: z.string().min(1), email: z.string().email() });
//   type FormData = z.infer<typeof schema>;
//
//   <FormWrapper
//     schema={schema}
//     defaultValues={{ name: '', email: '' }}
//     onSubmit={async (data) => { await saveUser(data); }}
//     submitLabel="Save"
//   >
//     {({ control }) => (
//       <>
//         <FormInput control={control} name="name" label="Name" />
//         <FormInput control={control} name="email" label="Email" type="email" />
//       </>
//     )}
//   </FormWrapper>

import * as React from 'react';
import { useForm, type DefaultValues, type Control, type FieldValues, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---- FormWrapper ----

interface FormWrapperProps<T extends FieldValues> {
  schema: ZodType<T>;
  defaultValues: DefaultValues<T>;
  onSubmit: (data: T) => Promise<void> | void;
  children: (props: { control: Control<T>; isSubmitting: boolean }) => React.ReactNode;
  /** Label for the submit button. Default: "Submit" */
  submitLabel?: string;
  /** Optional cancel handler. Renders a Cancel button when provided. */
  onCancel?: () => void;
  cancelLabel?: string;
  /** Additional class for the form element. */
  className?: string;
  /** Show a reset button. */
  showReset?: boolean;
  resetLabel?: string;
}

export function FormWrapper<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  submitLabel = 'Submit',
  onCancel,
  cancelLabel = 'Cancel',
  className,
  showReset = false,
  resetLabel = 'Reset',
}: FormWrapperProps<T>) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleSubmit = async (data: T) => {
    setServerError(null);
    try {
      await onSubmit(data);
    } catch (err: unknown) {
      // Parse standardized API error
      if (isApiError(err)) {
        setServerError(err.error.message);
        // Apply field-level errors if available
        if (Array.isArray(err.error.details)) {
          for (const detail of err.error.details) {
            if (detail.field) {
              form.setError(detail.field as Path<T>, {
                type: 'server',
                message: detail.message,
              });
            }
          }
        }
        return;
      }
      if (err instanceof Error) {
        setServerError(err.message);
        return;
      }
      setServerError('An unexpected error occurred');
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn('space-y-6', className)}
      >
        {/* Server error banner */}
        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {children({ control: form.control, isSubmitting: form.formState.isSubmitting })}

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {submitLabel}
          </Button>
          {showReset && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                setServerError(null);
              }}
              disabled={form.formState.isSubmitting}
            >
              {resetLabel}
            </Button>
          )}
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={form.formState.isSubmitting}
            >
              {cancelLabel}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}

// ---- Field helpers ----

interface FormInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  description?: string;
  type?: React.HTMLInputTypeAttribute;
  disabled?: boolean;
  className?: string;
}

/** Text input field with label, description, and error display. */
export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  type = 'text',
  disabled,
  className,
}: FormInputProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface FormTextareaProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  description?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
}

/** Textarea field with label, description, and error display. */
export function FormTextarea<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  rows = 3,
  disabled,
  className,
}: FormTextareaProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea
              placeholder={placeholder}
              rows={rows}
              disabled={disabled}
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ---- Helpers ----

interface ApiErrorShape {
  success: false;
  error: { code: string; message: string; details?: { field?: string; message?: string }[] };
}

function isApiError(val: unknown): val is ApiErrorShape {
  return (
    typeof val === 'object' &&
    val !== null &&
    'success' in val &&
    (val as { success: unknown }).success === false &&
    'error' in val &&
    typeof (val as { error: unknown }).error === 'object'
  );
}

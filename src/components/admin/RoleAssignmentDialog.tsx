'use client';

/**
 * RoleAssignmentDialog
 * Dialog for SC/SUPERADMIN to change a user's role.
 * Requires reason (min 20 chars). Double-confirm for sensitive roles.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/hooks/useConfirm';
import { createLogger } from '@/lib/logger';

const log = createLogger('role-assignment-dialog');

const ALL_ROLES = [
  'MABA', 'KP', 'KASUH', 'OC', 'ELDER', 'SC',
  'PEMBINA', 'BLM', 'SATGAS', 'ALUMNI', 'DOSEN_WALI',
] as const;

const SUPERADMIN_ONLY_ROLES = ['SC', 'PEMBINA', 'BLM'] as const;
const SENSITIVE_ROLES = ['SC', 'PEMBINA', 'BLM', 'SATGAS'] as const;

type UserRole = typeof ALL_ROLES[number] | 'SUPERADMIN';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userFullName: string;
  currentRole: UserRole;
  viewerRole: UserRole;
  onSuccess: () => void;
}

export function RoleAssignmentDialog({
  open,
  onOpenChange,
  userId,
  userFullName,
  currentRole,
  viewerRole,
  onSuccess,
}: Props) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [newRole, setNewRole] = useState<string>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableRoles = viewerRole === 'SUPERADMIN'
    ? [...ALL_ROLES, 'SUPERADMIN' as const]
    : ALL_ROLES.filter((r) => !SUPERADMIN_ONLY_ROLES.includes(r as typeof SUPERADMIN_ONLY_ROLES[number]));

  const isSensitive = SENSITIVE_ROLES.includes(newRole as typeof SENSITIVE_ROLES[number]);
  const canSubmit = newRole && newRole !== currentRole && reason.length >= 20;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);

    if (isSensitive) {
      const confirmed = await confirm({
        title: `Tetapkan role ${newRole}?`,
        description: `Anda akan mengubah role ${userFullName} ke ${newRole}. Role ini memiliki akses lebih luas. Pengguna akan dipaksa login ulang.`,
        confirmLabel: 'Ya, Ubah Role',
        variant: 'destructive',
      });
      if (!confirmed) return;
    }

    setSubmitting(true);
    try {
      log.info('Changing user role', { userId, newRole });
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, reason }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body?.error?.message ?? 'Gagal mengubah role');
        return;
      }
      toast.success(`Role ${userFullName} berhasil diubah ke ${newRole}`);
      onOpenChange(false);
      setNewRole('');
      setReason('');
      onSuccess();
    } catch (err) {
      log.error('Failed to change role', { err });
      toast.error('Gagal mengubah role');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah Role Pengguna</DialogTitle>
            <DialogDescription>
              Mengubah role <strong>{userFullName}</strong>. Pengguna akan dipaksa login ulang setelah perubahan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <Alert className="border-2 border-red-400 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <Label className="text-sm font-medium">Role Saat Ini</Label>
              <div className="text-sm px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono">
                {currentRole}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="newRole" className="text-sm font-medium">
                Role Baru <span className="text-red-500">*</span>
              </Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger id="newRole">
                  <SelectValue placeholder="Pilih role baru" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles
                    .filter((r) => r !== currentRole)
                    .map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                        {SENSITIVE_ROLES.includes(r as typeof SENSITIVE_ROLES[number]) && (
                          <span className="ml-2 text-xs text-amber-600">(sensitif)</span>
                        )}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="reason" className="text-sm font-medium">
                Alasan <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Jelaskan alasan perubahan role ini (min. 20 karakter)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className={`text-xs ${reason.length < 20 ? 'text-red-500' : 'text-gray-400'}`}>
                {reason.length}/20 karakter minimum
              </p>
            </div>

            {isSensitive && newRole && (
              <Alert className="border-2 border-amber-400 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  Role <strong>{newRole}</strong> adalah role sensitif dengan akses lebih luas.
                  Konfirmasi tambahan diperlukan.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="bg-sky-500 hover:bg-sky-600 text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ubah Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </>
  );
}

'use client';

/**
 * src/components/time-capsule/ShareToggleConfirm.tsx
 * NAWASENA M07 — Modal to confirm share toggle for Time Capsule entries or Life Map goals.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShareIcon, LockIcon, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';

interface ShareToggleConfirmProps {
  /** Entry or goal ID */
  resourceId: string;
  /** 'time-capsule' or 'life-map' */
  resourceType: 'time-capsule' | 'life-map';
  currentShared: boolean;
  onToggleComplete: (newValue: boolean) => void;
  trigger: React.ReactNode;
}

export function ShareToggleConfirm({
  resourceId,
  resourceType,
  currentShared,
  onToggleComplete,
  trigger,
}: ShareToggleConfirmProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const newValue = !currentShared;

  const apiPath =
    resourceType === 'time-capsule'
      ? `/api/time-capsule/${resourceId}/share`
      : `/api/life-map/${resourceId}/share`;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharedWithKasuh: newValue }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(
          newValue
            ? 'Catatan berhasil dibagikan ke Kakak Kasuh'
            : 'Catatan kembali bersifat privat',
        );
        onToggleComplete(newValue);
        setOpen(false);
      } else {
        toast.apiError(json);
      }
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {newValue ? (
                <>
                  <ShareIcon className="h-4 w-4 text-sky-500" />
                  Bagikan ke Kakak Kasuh?
                </>
              ) : (
                <>
                  <LockIcon className="h-4 w-4 text-gray-500" />
                  Jadikan Privat?
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {newValue
                ? 'Kakak Kasuhmu akan dapat membaca catatan ini. Kamu dapat mengubah pengaturan ini kapan saja.'
                : 'Catatan ini tidak akan lagi terlihat oleh Kakak Kasuhmu. Kamu dapat membagikannya kembali kapan saja.'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className={
                newValue
                  ? 'bg-sky-500 hover:bg-sky-600 text-white rounded-xl'
                  : 'bg-gray-600 hover:bg-gray-700 text-white rounded-xl'
              }
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : newValue ? (
                'Bagikan'
              ) : (
                'Jadikan Privat'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

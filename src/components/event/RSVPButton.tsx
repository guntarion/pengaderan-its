/**
 * src/components/event/RSVPButton.tsx
 * Button for RSVP / decline action on an instance.
 * Shows waitlist modal when capacity is full.
 * Handles CONFIRMED, WAITLIST, DECLINED states.
 */

'use client';

import React, { useState } from 'react';
import { Loader2, CheckCircleIcon, ClockIcon } from 'lucide-react';
import { toast } from '@/lib/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/useConfirm';

interface RSVPButtonProps {
  instanceId: string;
  currentStatus: 'CONFIRMED' | 'WAITLIST' | 'DECLINED' | null;
  instanceStatus: 'PLANNED' | 'RUNNING' | 'DONE' | 'CANCELLED';
  onStatusChange?: (newStatus: 'CONFIRMED' | 'WAITLIST' | 'DECLINED') => void;
}

export function RSVPButton({ instanceId, currentStatus, instanceStatus, onStatusChange }: RSVPButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const canRSVP = instanceStatus === 'PLANNED' || instanceStatus === 'RUNNING';

  const handleRSVP = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/event/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.apiError(data);
        return;
      }

      const newStatus = data.data?.rsvpStatus as 'CONFIRMED' | 'WAITLIST';
      if (newStatus === 'WAITLIST') {
        setShowWaitlistModal(true);
      } else {
        toast.success('Berhasil mendaftar kegiatan!');
      }
      onStatusChange?.(newStatus);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    const ok = await confirm({
      title: 'Batalkan RSVP?',
      description: 'Slot kamu akan diberikan ke peserta di antrean.',
      confirmLabel: 'Batalkan RSVP',
      variant: 'destructive',
    });
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/event/rsvp/${instanceId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (!res.ok) {
        toast.apiError(data);
        return;
      }

      toast.success('RSVP dibatalkan.');
      onStatusChange?.('DECLINED');
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  };

  if (!canRSVP) {
    return null;
  }

  if (currentStatus === 'CONFIRMED') {
    return (
      <>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircleIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Kamu sudah terdaftar</span>
          </div>
          <button
            onClick={handleDecline}
            disabled={loading}
            className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300 underline disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Batalkan RSVP'}
          </button>
        </div>
        <ConfirmDialog />
      </>
    );
  }

  if (currentStatus === 'WAITLIST') {
    return (
      <>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <ClockIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Kamu di antrean</span>
          </div>
          <button
            onClick={handleDecline}
            disabled={loading}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Keluar dari antrean'}
          </button>
        </div>
        <ConfirmDialog />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleRSVP}
        disabled={loading}
        className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl px-6 py-2.5 font-medium hover:from-sky-600 hover:to-blue-700 transition-all disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {loading ? 'Memproses...' : currentStatus === 'DECLINED' ? 'Daftar Lagi' : 'Daftar Sekarang'}
      </Button>

      {/* Waitlist success modal */}
      <Dialog open={showWaitlistModal} onOpenChange={setShowWaitlistModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-amber-500" />
              Masuk Antrean
            </DialogTitle>
            <DialogDescription>
              Kapasitas kegiatan sudah penuh. Kamu berhasil masuk ke daftar antrean.
              Kamu akan mendapat notifikasi jika ada slot yang tersedia.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowWaitlistModal(false)} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl">
              Mengerti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </>
  );
}

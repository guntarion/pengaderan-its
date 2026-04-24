'use client';

/**
 * src/components/m09/KasuhLogForm.tsx
 * NAWASENA M09 — Kasuh biweekly logbook form.
 *
 * Radio attendance (MET / NOT_MET) with conditional fields.
 * MET: meetingDate (required), reflection (min 30 chars required), followupNotes (optional), flagUrgent
 * NOT_MET: attendanceReason (required), reflection (optional), followupNotes (optional)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Loader2, CheckCircle, Users, UserX, AlertTriangle } from 'lucide-react';

const log = createLogger('kasuh-log-form');

type Attendance = 'MET' | 'NOT_MET';

interface KasuhLogFormProps {
  pairId: string;
  cycleNumber: number;
  mabaName: string;
  onSuccess?: () => void;
}

export function KasuhLogForm({ pairId, cycleNumber, mabaName, onSuccess }: KasuhLogFormProps) {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  // MET fields
  const [meetingDate, setMeetingDate] = useState('');
  const [reflection, setReflection] = useState('');
  const [flagUrgent, setFlagUrgent] = useState(false);
  const [followupNotes, setFollowupNotes] = useState('');
  // NOT_MET fields
  const [attendanceReason, setAttendanceReason] = useState('');
  const [notMetReflection, setNotMetReflection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = () => {
    if (!attendance) return false;
    if (attendance === 'MET') {
      return meetingDate.length > 0 && reflection.trim().length >= 30;
    }
    if (attendance === 'NOT_MET') {
      return attendanceReason.trim().length >= 10;
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit()) return;

    setIsSubmitting(true);

    try {
      log.info('Submitting Kasuh log', { pairId, cycleNumber, attendance });

      const payload =
        attendance === 'MET'
          ? {
              pairId,
              cycleNumber,
              attendance: 'MET' as const,
              meetingDate,
              reflection: reflection.trim(),
              flagUrgent,
              followupNotes: followupNotes.trim() || undefined,
            }
          : {
              pairId,
              cycleNumber,
              attendance: 'NOT_MET' as const,
              attendanceReason: attendanceReason.trim(),
              reflection: notMetReflection.trim() || undefined,
              followupNotes: followupNotes.trim() || undefined,
            };

      const res = await fetch(`/api/kasuh/log/${pairId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }

      toast.success(`Log siklus ke-${cycleNumber} berhasil disimpan`);
      onSuccess?.();
    } catch (err) {
      log.error('Failed to submit Kasuh log', { err });
      toast.error('Gagal menyimpan log');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Attendance Radio */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Pertemuan dengan {mabaName}
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAttendance('MET')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              attendance === 'MET'
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-sky-200'
            }`}
          >
            <Users
              className={`h-6 w-6 ${attendance === 'MET' ? 'text-emerald-500' : 'text-gray-400'}`}
            />
            <span
              className={`text-sm font-medium ${
                attendance === 'MET'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Bertemu
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAttendance('NOT_MET')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              attendance === 'NOT_MET'
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-sky-200'
            }`}
          >
            <UserX
              className={`h-6 w-6 ${attendance === 'NOT_MET' ? 'text-amber-500' : 'text-gray-400'}`}
            />
            <span
              className={`text-sm font-medium ${
                attendance === 'NOT_MET'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Tidak Bertemu
            </span>
          </button>
        </div>
      </div>

      {/* MET fields */}
      {attendance === 'MET' && (
        <>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tanggal Pertemuan <span className="text-red-400">*</span>
            </Label>
            <Input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              disabled={isSubmitting}
              className="border-sky-200 dark:border-sky-800 rounded-xl text-sm"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Refleksi Pertemuan <span className="text-red-400">*</span>
            </Label>
            <p className="text-xs text-gray-400">Apa yang dibahas? Bagaimana kondisi adik asuhmu?</p>
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Ceritakan pertemuan ini: topik yang dibahas, kondisi adik asuh, dan apa yang kamu amati..."
              rows={5}
              maxLength={2000}
              disabled={isSubmitting}
              className={`resize-none rounded-xl text-sm ${
                reflection.trim().length > 0 && reflection.trim().length < 30
                  ? 'border-amber-300 dark:border-amber-700'
                  : 'border-sky-200 dark:border-sky-800 focus:ring-sky-500'
              }`}
            />
            <p className="text-xs text-gray-400 text-right">
              {reflection.trim().length}/2000
              {reflection.trim().length > 0 && reflection.trim().length < 30 && (
                <span className="text-amber-500 ml-2">(minimal 30 karakter)</span>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Catatan Tindak Lanjut (opsional)
            </Label>
            <Textarea
              value={followupNotes}
              onChange={(e) => setFollowupNotes(e.target.value)}
              placeholder="Rencana atau hal yang perlu ditindaklanjuti..."
              rows={2}
              maxLength={500}
              disabled={isSubmitting}
              className="resize-none border-sky-200 dark:border-sky-800 focus:ring-sky-500 rounded-xl text-sm"
            />
          </div>

          {/* Urgent flag */}
          <div className="p-3 border border-red-200 dark:border-red-800 rounded-xl space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox
                id="flag-urgent"
                checked={flagUrgent}
                onCheckedChange={(v) => setFlagUrgent(!!v)}
                disabled={isSubmitting}
              />
              <div>
                <Label
                  htmlFor="flag-urgent"
                  className="text-sm font-medium text-red-700 dark:text-red-400 cursor-pointer"
                >
                  <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                  Tandai sebagai Urgent
                </Label>
                <p className="text-xs text-gray-400 mt-0.5">
                  Aktifkan jika adik asuhmu membutuhkan perhatian segera dari SC
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* NOT_MET fields */}
      {attendance === 'NOT_MET' && (
        <>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Alasan Tidak Bertemu <span className="text-red-400">*</span>
            </Label>
            <Textarea
              value={attendanceReason}
              onChange={(e) => setAttendanceReason(e.target.value)}
              placeholder="Kenapa pertemuan tidak terjadi siklus ini?"
              rows={3}
              maxLength={200}
              disabled={isSubmitting}
              className={`resize-none rounded-xl text-sm ${
                attendanceReason.trim().length > 0 && attendanceReason.trim().length < 10
                  ? 'border-amber-300 dark:border-amber-700'
                  : 'border-amber-200 dark:border-amber-800 focus:ring-amber-400'
              }`}
            />
            <p className="text-xs text-gray-400 text-right">
              {attendanceReason.trim().length}/200
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Catatan Tambahan (opsional)
            </Label>
            <Textarea
              value={notMetReflection}
              onChange={(e) => setNotMetReflection(e.target.value)}
              placeholder="Hal lain yang perlu dicatat untuk periode ini..."
              rows={2}
              maxLength={500}
              disabled={isSubmitting}
              className="resize-none border-sky-200 dark:border-sky-800 focus:ring-sky-500 rounded-xl text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Rencana Tindak Lanjut (opsional)
            </Label>
            <Textarea
              value={followupNotes}
              onChange={(e) => setFollowupNotes(e.target.value)}
              placeholder="Rencana pertemuan berikutnya atau langkah yang akan diambil..."
              rows={2}
              maxLength={500}
              disabled={isSubmitting}
              className="resize-none border-sky-200 dark:border-sky-800 focus:ring-sky-500 rounded-xl text-sm"
            />
          </div>
        </>
      )}

      {/* Submit */}
      {attendance && (
        <Button
          type="submit"
          disabled={!canSubmit() || isSubmitting}
          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl py-3 font-medium hover:from-sky-600 hover:to-blue-700 transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Menyimpan...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Simpan Log Siklus ke-{cycleNumber}
            </>
          )}
        </Button>
      )}
    </form>
  );
}

'use client';

/**
 * src/components/mental-health/SACCaseDetail.tsx
 * NAWASENA M11 — SAC case detail view.
 *
 * PRIVACY-CRITICAL:
 *   - Shows only metadata (severity, instrument, phase, SLA, flags).
 *   - "Decrypt & View Answers" triggers audit warning + useConfirm before calling /decrypt.
 *   - Decrypted answers shown inline after confirmation.
 *   - No Maba PII displayed.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { AlertTriangle, Clock, ShieldAlert, Eye, FileText, ArrowRightLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/lib/toast';

interface TimelineEntry {
  id: string;
  actorId: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string | Date;
}

interface ScreeningMeta {
  id: string;
  instrument: string;
  phase: string;
  severity: string;
  immediateContact: boolean;
  flagged: boolean;
  recordedAt: string | Date;
}

interface DecryptedAnswer {
  id: string;
  questionIndex: number;
  answerValue: number;
}

export interface SACReferralDetail {
  id: string;
  status: string;
  slaDeadlineAt: string | Date;
  escalatedAt: string | Date | null;
  acknowledgedAt: string | Date | null;
  statusChangedAt: string | Date;
  assignmentReason: string | null;
  reassignedFromId: string | null;
  reassignedReason: string | null;
  createdAt: string | Date;
  screening: ScreeningMeta | null;
  timeline: TimelineEntry[];
}

interface SACCaseDetailProps {
  referral: SACReferralDetail;
}

const SEVERITY_LABELS: Record<string, string> = {
  RED: 'Merah (Tinggi)',
  YELLOW: 'Kuning (Sedang)',
  GREEN: 'Hijau (Minimal)',
};

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Referral Dibuat',
  STATUS_CHANGED: 'Status Diubah',
  NOTE_ADDED: 'Catatan Ditambahkan',
  REASSIGNED: 'Dialihkan',
  ESCALATED: 'Dieskalasi',
  M10_REFERRED: 'Dirujuk ke M10 (Safeguard)',
};

const PHQ9_QUESTIONS = [
  'Kurang minat atau kesenangan dalam melakukan sesuatu',
  'Merasa sedih, tertekan, atau putus asa',
  'Susah tidur, tidak bisa tidur, atau tidur terlalu banyak',
  'Merasa lelah atau kekurangan energi',
  'Kurang nafsu makan atau makan berlebihan',
  'Merasa buruk tentang diri sendiri atau merasa gagal',
  'Sulit berkonsentrasi pada sesuatu',
  'Bergerak atau berbicara sangat lambat, atau sebaliknya sangat gelisah',
  'Pikiran untuk menyakiti diri sendiri atau lebih baik mati',
];

const ANSWER_LABELS = ['Tidak pernah', 'Beberapa hari', 'Lebih dari separuh hari', 'Hampir setiap hari'];

export function SACCaseDetail({ referral }: SACCaseDetailProps) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [decryptedAnswers, setDecryptedAnswers] = useState<DecryptedAnswer[] | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const deadline = typeof referral.slaDeadlineAt === 'string'
    ? new Date(referral.slaDeadlineAt)
    : referral.slaDeadlineAt;
  const isPastDeadline = deadline < new Date();

  async function handleDecrypt() {
    const confirmed = await confirm(
      'Membuka Data Terenkripsi',
      'Membuka data ini akan tercatat dalam audit log. Hanya lakukan jika Anda memerlukan akses ke jawaban untuk keperluan konseling resmi.',
    );

    if (!confirmed) return;

    setIsDecrypting(true);
    try {
      const res = await fetch(`/api/mental-health/referrals/${referral.id}/decrypt`);
      if (!res.ok) {
        const err = await res.json();
        throw err;
      }
      const { data } = await res.json();
      setDecryptedAnswers(data.answers);
      toast.success('Data berhasil dibuka. Akses ini telah dicatat dalam audit log.');
    } catch (err) {
      toast.apiError(err);
    } finally {
      setIsDecrypting(false);
    }
  }

  return (
    <>
      <ConfirmDialog />

      <div className="space-y-6">
        {/* Urgency banner */}
        {referral.screening?.immediateContact && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-300">Kontak Segera Dibutuhkan (24 jam)</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Kasus ini memerlukan respons dalam 24 jam. Keterlambatan akan memicu eskalasi otomatis.
              </p>
            </div>
          </div>
        )}

        {/* Escalation notice */}
        {referral.escalatedAt && (
          <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-orange-700 dark:text-orange-300">Referral Ini Telah Dieskalasi</p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Eskalasi dikirim ke koordinator Poli Psikologi.
              </p>
            </div>
          </div>
        )}

        {/* Meta info */}
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Detail Referral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tingkat Keparahan</dt>
                <dd>
                  <Badge
                    variant="outline"
                    className={
                      referral.screening?.severity === 'RED'
                        ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300'
                        : referral.screening?.severity === 'YELLOW'
                          ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
                    }
                  >
                    {SEVERITY_LABELS[referral.screening?.severity ?? ''] ?? referral.screening?.severity}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">Instrumen</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">
                  {referral.screening?.instrument ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fase</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {referral.screening?.phase ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status Referral</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {referral.status}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">Diserahkan</dt>
                <dd className="text-sm text-gray-700 dark:text-gray-300">
                  {referral.screening?.recordedAt
                    ? format(new Date(referral.screening.recordedAt), 'dd MMMM yyyy HH:mm', { locale: idLocale })
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Batas SLA
                </dt>
                <dd className={`text-sm font-medium ${isPastDeadline ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {format(deadline, 'dd MMMM yyyy HH:mm', { locale: idLocale })} WIB
                  <span className="ml-2 text-xs text-gray-400">
                    ({formatDistanceToNow(deadline, { addSuffix: true, locale: idLocale })})
                  </span>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Decrypt answers */}
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900">
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Jawaban Skrining
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!decryptedAnswers ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Jawaban dienkripsi untuk melindungi privasi. Membuka data ini akan tercatat
                    dalam audit log keamanan. Hanya buka jika diperlukan untuk sesi konseling.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDecrypt}
                  disabled={isDecrypting}
                  className="bg-transparent border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-900/20"
                >
                  {isDecrypting ? 'Membuka...' : 'Buka Jawaban (dengan Konfirmasi)'}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-3">
                  Akses ini tercatat dalam audit log.
                </p>
                {decryptedAnswers.map((ans) => (
                  <div key={ans.id} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <span className="text-xs text-gray-400 w-4 flex-shrink-0 mt-0.5">{ans.questionIndex + 1}.</span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {PHQ9_QUESTIONS[ans.questionIndex] ?? `Pertanyaan ${ans.questionIndex + 1}`}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                        {ANSWER_LABELS[ans.answerValue] ?? String(ans.answerValue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900">
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Riwayat Kasus
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referral.timeline.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada riwayat.</p>
            ) : (
              <ol className="space-y-3">
                {referral.timeline.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-sky-400 dark:bg-sky-600 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm', { locale: idLocale })}
                        {entry.actorId !== 'system' ? ` — oleh ${entry.actorId.slice(0, 8)}` : ' — sistem'}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button asChild className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl">
            <Link href={`/dashboard/sac/screening-queue/${referral.id}/follow-up`}>
              <FileText className="h-4 w-4 mr-2" />
              Tambah Catatan / Update Status
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}

export default SACCaseDetail;

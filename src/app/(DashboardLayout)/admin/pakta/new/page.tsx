'use client';

/**
 * /admin/pakta/new
 * SC admin — publish a new pakta version.
 * Roles: SC, SUPERADMIN
 *
 * Simple form for MVP — markdown textarea + 5 quiz questions inline.
 * In M15+ this can be replaced with a rich markdown editor.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/hooks/useConfirm';
import { createLogger } from '@/lib/logger';
import { FilePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const log = createLogger('admin-pakta-new-page');

const PAKTA_TYPES = [
  { value: 'PAKTA_PANITIA', label: 'Pakta Panitia' },
  { value: 'SOCIAL_CONTRACT_MABA', label: 'Social Contract MABA' },
  { value: 'PAKTA_PENGADER_2027', label: 'Pakta Pengader 2027' },
] as const;

interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctAnswerIds: string[];
}

function emptyQuestion(idx: number): QuizQuestion {
  return {
    id: `q${idx + 1}`,
    question: '',
    options: [
      { id: `q${idx + 1}_a`, text: '' },
      { id: `q${idx + 1}_b`, text: '' },
      { id: `q${idx + 1}_c`, text: '' },
      { id: `q${idx + 1}_d`, text: '' },
    ],
    correctAnswerIds: [],
  };
}

export default function AdminPaktaNewPage() {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();

  const [paktaType, setPaktaType] = useState<string>('');
  const [title, setTitle] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  );
  const [passingScore, setPassingScore] = useState(80);
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    emptyQuestion(0),
    emptyQuestion(1),
    emptyQuestion(2),
    emptyQuestion(3),
    emptyQuestion(4),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateQuestion = (idx: number, field: keyof QuizQuestion, value: unknown) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (qIdx: number, oIdx: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const newOptions = q.options.map((o, oi) =>
          oi === oIdx ? { ...o, text } : o
        );
        return { ...q, options: newOptions };
      })
    );
  };

  const setCorrectAnswer = (qIdx: number, optionId: string) => {
    updateQuestion(qIdx, 'correctAnswerIds', [optionId]);
  };

  const handlePublish = async () => {
    // Validate
    if (!paktaType || !title || contentMarkdown.length < 100) {
      toast.error('Lengkapi semua field (konten minimal 100 karakter)');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim() || q.question.trim().length < 10) {
        toast.error(`Pertanyaan ${i + 1}: minimal 10 karakter`);
        return;
      }
      if (q.options.some((o) => !o.text.trim())) {
        toast.error(`Pertanyaan ${i + 1}: semua opsi harus diisi`);
        return;
      }
      if (q.correctAnswerIds.length === 0) {
        toast.error(`Pertanyaan ${i + 1}: pilih jawaban benar`);
        return;
      }
    }

    const confirmed = await confirm({
      title: 'Terbitkan Versi Pakta?',
      description:
        'Versi baru akan diterbitkan. Jika ada versi aktif sebelumnya, semua penanda tangan lama akan diminta menandatangani ulang.',
      confirmLabel: 'Ya, Terbitkan',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    log.info('Publishing pakta version', { paktaType, title });

    try {
      const res = await fetch('/api/admin/pakta/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: paktaType,
          title,
          contentMarkdown,
          quizQuestions: questions,
          effectiveFrom: new Date(effectiveFrom).toISOString(),
          passingScore,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.apiError(json);
        return;
      }

      const { versionNumber, resignedCount } = json.data;
      toast.success(
        `Versi ${versionNumber} berhasil diterbitkan. ${resignedCount} user diminta re-sign.`
      );
      router.push('/admin/pakta');
    } catch (err) {
      toast.error('Kesalahan jaringan saat menerbitkan');
      log.error('Publish error', { error: err });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />

        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 p-6 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5">
              <FilePlus className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Terbitkan Versi Pakta Baru</h1>
              <p className="text-sm text-sky-100 mt-0.5">
                Isi konten + 5 pertanyaan post-test
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Informasi Dasar
          </h2>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Tipe Pakta</Label>
            <Select value={paktaType} onValueChange={setPaktaType}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Pilih tipe pakta..." />
              </SelectTrigger>
              <SelectContent>
                {PAKTA_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Judul Dokumen</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="misal: Pakta Panitia NAWASENA 2026 HMTC v2"
              className="rounded-xl"
            />
          </div>

          {/* Effective from */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="effectiveFrom">Berlaku Mulai</Label>
              <Input
                id="effectiveFrom"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="passingScore">Passing Score (%)</Label>
              <Input
                id="passingScore"
                type="number"
                min={50}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value, 10))}
                className="rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Markdown content */}
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Konten Dokumen (Markdown)
            </h2>
            <span className="text-xs text-gray-400">{contentMarkdown.length} karakter</span>
          </div>
          <Textarea
            value={contentMarkdown}
            onChange={(e) => setContentMarkdown(e.target.value)}
            placeholder="# Pakta Panitia NAWASENA 2026&#10;&#10;## Pembukaan&#10;&#10;Saya yang bertanda tangan di bawah ini..."
            className="min-h-[300px] resize-y rounded-xl font-mono text-sm"
          />
          {contentMarkdown.length > 0 && contentMarkdown.length < 100 && (
            <p className="text-xs text-red-500">
              Konten terlalu pendek (minimal 100 karakter)
            </p>
          )}
        </div>

        {/* Quiz questions */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Pertanyaan Post-Test (5 pertanyaan)
          </h2>

          {questions.map((q, qIdx) => (
            <div
              key={q.id}
              className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4"
            >
              <div className="flex items-start gap-2">
                <span className="h-6 w-6 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {qIdx + 1}
                </span>
                <Textarea
                  value={q.question}
                  onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                  placeholder={`Pertanyaan ${qIdx + 1}...`}
                  className="min-h-[60px] resize-none rounded-xl text-sm flex-1"
                />
              </div>

              <div className="space-y-2 pl-8">
                {q.options.map((opt, oIdx) => {
                  const isCorrect = q.correctAnswerIds.includes(opt.id);
                  return (
                    <div key={opt.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCorrectAnswer(qIdx, opt.id)}
                        className={[
                          'h-5 w-5 rounded-full border-2 flex-shrink-0 transition-colors',
                          isCorrect
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-gray-300 dark:border-gray-600 hover:border-sky-400',
                        ].join(' ')}
                        title="Set as correct answer"
                      />
                      <span className="text-xs text-gray-500 w-5">
                        {String.fromCharCode(65 + oIdx)}.
                      </span>
                      <Input
                        value={opt.text}
                        onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                        placeholder={`Opsi ${String.fromCharCode(65 + oIdx)}`}
                        className="rounded-xl text-sm h-9 flex-1"
                      />
                    </div>
                  );
                })}
                <p className="text-xs text-gray-400 pl-7">
                  Klik lingkaran hijau untuk menandai jawaban benar
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="border-gray-200 bg-transparent"
          >
            Batal
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:opacity-90 px-8"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Menerbitkan...
              </span>
            ) : (
              'Terbitkan Versi Baru'
            )}
          </Button>
        </div>
      </div>

      <ConfirmDialog />
    </div>
  );
}

/**
 * src/app/(WebsiteLayout)/mental-health/help-seeking/page.tsx
 * NAWASENA M11 — Public help-seeking resource page.
 * No auth required. Renders help-seeking.md with react-markdown.
 */

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { readFileSync } from 'fs';
import { join } from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Phone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cara Mencari Bantuan — Kesehatan Mental ITS',
  description: 'Panduan mencari bantuan kesehatan mental untuk mahasiswa ITS.',
};

function getMarkdownContent(): string {
  try {
    const filePath = join(process.cwd(), 'src/content/mh-resources/help-seeking.md');
    return readFileSync(filePath, 'utf-8');
  } catch {
    return '# Mencari Bantuan\n\nKonten sedang dimuat...';
  }
}

export default function HelpSeekingPage() {
  const content = getMarkdownContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-10 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-2 mb-1 text-white/80 text-sm">
            <Link href="/mental-health" className="hover:text-white">&larr; Kesehatan Mental</Link>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Cara Mencari Bantuan</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8">
          <div className="prose prose-sm prose-sky dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>

        {/* Emergency callout */}
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl text-center">
          <p className="text-sm font-bold text-red-700 dark:text-red-300">Butuh bantuan segera?</p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            Hubungi <strong>119 ext 8</strong> (Into The Light, 24 jam) atau{' '}
            <strong>112</strong> (darurat)
          </p>
        </div>
      </div>
    </div>
  );
}

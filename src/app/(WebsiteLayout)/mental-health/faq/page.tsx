/**
 * src/app/(WebsiteLayout)/mental-health/faq/page.tsx
 * NAWASENA M11 — Public FAQ anti-stigma page.
 * No auth required. Renders faq-anti-stigma.md with react-markdown.
 */

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { readFileSync } from 'fs';
import { join } from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HelpCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'FAQ Kesehatan Mental — ITS',
  description: 'Pertanyaan umum tentang skrining kesehatan mental, privasi data, dan anti-stigma untuk mahasiswa ITS.',
};

function getMarkdownContent(): string {
  try {
    const filePath = join(process.cwd(), 'src/content/mh-resources/faq-anti-stigma.md');
    return readFileSync(filePath, 'utf-8');
  } catch {
    return '# FAQ\n\nKonten sedang dimuat...';
  }
}

export default function FAQPage() {
  const content = getMarkdownContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 text-white py-10 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-2 mb-1 text-white/80 text-sm">
            <Link href="/mental-health" className="hover:text-white">&larr; Kesehatan Mental</Link>
          </div>
          <div className="flex items-center gap-3">
            <HelpCircle className="w-6 h-6" />
            <h1 className="text-2xl font-bold">FAQ: Tentang Kesehatan Mental</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8">
          <div className="prose prose-sm prose-violet dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

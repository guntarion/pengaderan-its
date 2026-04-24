'use client';

/**
 * src/components/admin/BulkImportPreviewTable.tsx
 * Shows bulk import preview: summary stats + error rows + valid sample rows.
 *
 * Uses shadcn Table directly (not DataTable) because we need custom row coloring
 * and the data is not paginated at the client level.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Users, AlertCircle } from 'lucide-react';
import type { PreviewResult } from './BulkImportUploader';

interface BulkImportPreviewTableProps {
  preview: PreviewResult;
  /** Map: email → decision. Used for controlling existing-user decisions. */
  decisions: Record<string, 'SKIP' | 'UPDATE'>;
  onDecisionChange: (email: string, decision: 'SKIP' | 'UPDATE') => void;
}

export function BulkImportPreviewTable({
  preview,
  decisions,
  onDecisionChange,
}: BulkImportPreviewTableProps) {
  const { summary, sample, headerErrors } = preview;

  if (headerErrors.length > 0) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-5">
        <div className="flex items-start gap-2">
          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400 mb-2">
              Format file CSV tidak valid
            </p>
            <ul className="space-y-1">
              {headerErrors.map((err, i) => (
                <li key={i} className="text-sm text-red-600 dark:text-red-300">
                  {err}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!summary || !sample) return null;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total baris"
          value={summary.totalRows}
          icon={<Users className="h-4 w-4" />}
          color="blue"
        />
        <StatCard
          label="Valid"
          value={summary.validRows}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="green"
        />
        <StatCard
          label="Error"
          value={summary.errorRows}
          icon={<XCircle className="h-4 w-4" />}
          color={summary.errorRows > 0 ? 'red' : 'gray'}
        />
        <StatCard
          label="User baru"
          value={summary.newUsers}
          icon={<Users className="h-4 w-4" />}
          color="sky"
        />
      </div>

      {/* Existing users info */}
      {summary.existingUsers > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {summary.existingUsers} user sudah ada
            </span>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-300">
            Pilih tindakan untuk setiap user yang sudah ada: SKIP (biarkan) atau UPDATE (perbarui role dan cohort).
          </p>
        </div>
      )}

      {/* Unknown cohort codes */}
      {summary.unknownCohortCodes.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700 dark:text-red-400">
              Kode cohort tidak ditemukan
            </span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-300">
            Cohort berikut tidak ada: {summary.unknownCohortCodes.join(', ')}
          </p>
        </div>
      )}

      {/* Error rows table */}
      {sample.errors.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <XCircle className="h-4 w-4" />
            Baris bermasalah ({summary.errorRows} baris)
            {summary.errorRows > sample.errors.length && (
              <span className="text-gray-400 font-normal">
                — menampilkan {sample.errors.length} pertama
              </span>
            )}
          </h3>
          <div className="rounded-2xl border border-red-200 dark:border-red-900 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-red-50 dark:bg-red-950/30">
                  <TableHead className="w-16">Baris</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sample.errors.map((row) => (
                  <TableRow key={row.lineNumber} className="bg-red-50/30 dark:bg-red-950/10">
                    <TableCell className="text-xs text-gray-500">{row.lineNumber}</TableCell>
                    <TableCell className="text-sm text-gray-700 dark:text-gray-200">
                      {row.raw.email || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700 dark:text-gray-200">
                      {row.raw.fullName || row.raw.fullname || '—'}
                    </TableCell>
                    <TableCell>
                      <ul className="space-y-0.5">
                        {row.errors?.map((err, i) => (
                          <li
                            key={i}
                            className="text-xs text-red-600 dark:text-red-400"
                          >
                            {err}
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Valid rows sample */}
      {sample.valid.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Baris valid ({summary.validRows} baris)
            {summary.validRows > sample.valid.length && (
              <span className="text-gray-400 font-normal">
                — menampilkan {sample.valid.length} pertama
              </span>
            )}
          </h3>
          <div className="rounded-2xl border border-sky-100 dark:border-sky-900 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-sky-50 dark:bg-sky-950/30">
                  <TableHead className="w-16">Baris</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Status</TableHead>
                  {summary.existingUsers > 0 && <TableHead>Tindakan</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sample.valid.map((row) => {
                  const email = row.data.email ?? '';
                  const isExisting = row.isExisting;
                  const decision = decisions[email] ?? 'SKIP';

                  return (
                    <TableRow key={row.lineNumber}>
                      <TableCell className="text-xs text-gray-500">{row.lineNumber}</TableCell>
                      <TableCell className="text-sm text-gray-700 dark:text-gray-200">
                        {email}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 dark:text-gray-200">
                        {row.data.fullName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {row.data.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {row.data.cohortCode}
                      </TableCell>
                      <TableCell>
                        {isExisting ? (
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-300 text-amber-700 dark:text-amber-400"
                          >
                            Sudah ada
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs border-green-300 text-green-700 dark:text-green-400"
                          >
                            Baru
                          </Badge>
                        )}
                      </TableCell>
                      {summary.existingUsers > 0 && (
                        <TableCell>
                          {isExisting ? (
                            <select
                              value={decision}
                              onChange={(e) =>
                                onDecisionChange(
                                  email,
                                  e.target.value as 'SKIP' | 'UPDATE'
                                )
                              }
                              className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1"
                            >
                              <option value="SKIP">SKIP</option>
                              <option value="UPDATE">UPDATE</option>
                            </select>
                          ) : (
                            <span className="text-xs text-gray-400">Buat baru</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Stat Card ----

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'sky' | 'gray';
}) {
  const colorMap = {
    blue: 'border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400',
    green:
      'border-emerald-100 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400',
    red: 'border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400',
    sky: 'border-sky-100 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400',
    gray: 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400',
  };

  return (
    <div
      className={`rounded-xl border p-4 flex items-center gap-3 ${colorMap[color]}`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs opacity-75">{label}</p>
      </div>
    </div>
  );
}

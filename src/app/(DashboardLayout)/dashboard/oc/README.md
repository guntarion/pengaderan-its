# OC Dashboard — Manajemen Pelaksanaan Kegiatan (M08 / M13)

## Tujuan

Antarmuka bagi Organizing Committee (OC), SC, dan SUPERADMIN untuk mengelola siklus hidup sesi kegiatan: dari pembuatan, pelaksanaan, pengumpulan output, hingga evaluasi pasca-acara.

## Struktur Rute

```
/dashboard/oc/                          OC dashboard (KPI widget + upcoming events)
/dashboard/oc/kegiatan/                 Daftar semua KegiatanInstance
/dashboard/oc/kegiatan/new              Wizard buat sesi baru
/dashboard/oc/kegiatan/[instanceId]/             Overview + lifecycle controls
/dashboard/oc/kegiatan/[instanceId]/attendance   Live counter + QR display + tabel
/dashboard/oc/kegiatan/[instanceId]/outputs      Upload & daftar output (file/link/video/repo)
/dashboard/oc/kegiatan/[instanceId]/evaluation   Formulir evaluasi pasca-acara
```

## State Machine Lifecycle

Transisi yang valid (dikelola oleh `lifecycle.service.ts`):

```
PLANNED → RUNNING   (manual OC / auto cron)
PLANNED → PLANNED   (reschedule)
PLANNED → CANCELLED
RUNNING → DONE
RUNNING → CANCELLED
```

After-commit hooks saat status `DONE`:
- `autoSetAlpaOnDone` — peserta yang tidak hadir di-set ALPA otomatis
- `triggerNPSForInstance` — memicu pengiriman NPS ke peserta confirmed
- (TODO) `EVALUATION_REMINDER` ke M15 (triwulan review)

After-commit hooks saat `CANCELLED`:
- `cascadeNotif` — notifikasi pembatalan ke semua RSVP confirmed
- `cancelNPSTrigger` — batalkan NPS trigger aktif

## Komponen Utama

| Komponen | Lokasi |
|---|---|
| `CreateInstanceWizard` | `src/components/event-execution/CreateInstanceWizard.tsx` |
| `LifecycleControls` | `src/components/event-execution/LifecycleControls.tsx` |
| `CapacityEditor` | `src/components/event-execution/CapacityEditor.tsx` |
| `CancellationModal` | `src/components/event-execution/CancellationModal.tsx` |
| `RescheduleModal` | `src/components/event-execution/RescheduleModal.tsx` |
| `CancellationProgressIndicator` | `src/components/event-execution/CancellationProgressIndicator.tsx` |
| `AttendanceLiveCounter` | `src/components/event-execution/AttendanceLiveCounter.tsx` |
| `AttendanceTable` | `src/components/event-execution/AttendanceTable.tsx` |
| `QRDisplay` | `src/components/event-execution/QRDisplay.tsx` |
| `OutputCard` / `OutputUploader` | `src/components/event-execution/Output*.tsx` |
| `EvaluationForm` + `AutoPrefillPreview` | `src/components/event-execution/Evaluation*.tsx` |
| `EventListCard` / `KPIMini` | `src/components/dashboard/widgets/` |

## Dependensi Lib Inti

- `src/lib/event-execution/` — seluruh service layer (lifecycle, QR, attendance, output, evaluation, reschedule, capacity)
- `src/lib/event-execution/cache/` — invalidasi Redis cache pasca-mutasi
- `src/lib/event-execution/notif/` — batch notifikasi RSVP confirmed
- `src/lib/cache.ts` — `withCache` / `invalidateCache`
- `src/lib/toast.ts` — feedback toast terstandar
- `src/lib/logger.ts` — `createLogger('m13/dashboard/oc')`

## API Endpoints

- `GET /api/dashboard/oc` — payload KPI + upcoming events
- `GET /api/event/instances/oc` — daftar instance untuk OC
- `GET/POST /api/event-execution/instances/[instanceId]/*` — detail, lifecycle, attendance, outputs, evaluation

## Output Upload (S3)

`OutputUploader` mengunggah file ke DigitalOcean Spaces/S3 melalui `output.service.ts`. Tipe yang didukung: `FILE`, `LINK`, `VIDEO`, `REPO`. Field `scanStatus` merekam hasil scan virus.

## Evaluasi Pasca-Acara

`EvaluationForm` hanya aktif jika status instance `DONE`. Data di-prefill dari:
- Persentase kehadiran aktual (`attendancePct`)
- Skor NPS agregat (`npsScore`)
- Jumlah red flags dari safeguard

Override manual tersedia dengan toggle per-field. Formulir bersifat read-only jika sudah pernah di-submit.

## Hak Akses

Roles yang diizinkan: `OC`, `SC`, `SUPERADMIN`.

## Referensi Lanjut

- Service layer: `src/lib/event-execution/README.md`
- Fitur pengguna: lihat `FEATURES.md` di folder ini

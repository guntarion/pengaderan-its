# Settings — Pengaturan Pengguna (M15)

Halaman preferensi pengguna untuk sistem notifikasi NAWASENA.

See feature catalog: `/src/app/(DashboardLayout)/settings/FEATURES.md`

---

## Subroutes

| Path | Purpose |
|---|---|
| `settings/notifications/` | Preferensi notifikasi per saluran dan push subscription |

Tidak ada `page.tsx` di root `settings/` — navigasi langsung ke subroute.

## Notifikasi (`notifications/page.tsx`)

Halaman tipis yang merender `UserPreferenceForm` dari
`src/components/notifications/UserPreferenceForm.tsx`.

- Logger: `createLogger('user-preference-form')` (di dalam komponen form).
- Data preferensi diambil dari `GET /api/notifications/preferences`.
- Perubahan disimpan via `PATCH /api/notifications/preferences`.

## UserPreferenceForm

Komponen form utama yang menangani:

1. **Push subscription prompt** — Jika browser mendukung Web Push dan pengguna belum berlangganan,
   banner muncul meminta izin. Hook `usePushSubscription` dari `@/hooks/use-push-subscription`
   mengelola `ServiceWorkerRegistration` dan `PushSubscription`.

2. **Toggle push global** (`pushEnabled`) — Mengaktifkan atau menonaktifkan semua push notification
   sekaligus tanpa mencabut subscription browser.

3. **Preferensi per saluran** — Untuk setiap rule notifikasi yang berlaku bagi peran pengguna,
   pengguna dapat memilih saluran yang diinginkan (in-app, email, push) atau menonaktifkan rule
   tertentu sepenuhnya.

## Key Components & Dependencies

- `UserPreferenceForm` dari `@/components/notifications/UserPreferenceForm`
- `usePushSubscription` dari `@/hooks/use-push-subscription`
- `DynamicBreadcrumb` dari `@/components/shared/DynamicBreadcrumb`
- `toast` dari `@/lib/toast`
- `createLogger` dari `@/lib/logger`
- API routes: `src/app/api/notifications/preferences/`
- Schema: `nawasena_notifications.prisma`

## Roles

Dapat diakses oleh semua pengguna yang sudah terautentikasi.
Rule yang ditampilkan difilter berdasarkan peran pengguna.

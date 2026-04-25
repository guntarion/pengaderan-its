# Profil Pengguna (M01)

Halaman profil dan pengaturan akun pengguna NAWASENA.

See feature catalog: `/src/app/(DashboardLayout)/profile/FEATURES.md`

---

## Subroutes

| Path | Purpose |
|---|---|
| `profile/` (`page.tsx`) | Halaman profil utama — foto, nama, NRP, peran |
| `profile/setup/` | Wizard pengaturan profil pertama kali (status `PENDING_PROFILE_SETUP`) |
| `profile/demographics/` | Formulir data diri dan demografi (opt-in) |

## Halaman Profil Utama (`page.tsx`)

Menampilkan foto profil, nama tampilan, NRP, dan peran pengguna.
Menyediakan tautan ke halaman edit foto dan halaman demografi.

Component: `ProfilePage` — menggunakan `useSession` dari NextAuth untuk data pengguna.

## Setup Wizard (`setup/page.tsx`)

Ditampilkan ketika `UserStatus === PENDING_PROFILE_SETUP`.
Mengumpulkan: `fullName`, `displayName`, `NRP`.

- Menggunakan `FormWrapper` + `FormInput` dari `@/components/shared/FormWrapper`.
- Logger: `createLogger('profile-setup-page')`.
- Setelah berhasil, status pengguna diperbarui dan middleware mengarahkan ke halaman berikutnya.

## Demografi (`demographics/page.tsx`)

Formulir opt-in untuk data diri tambahan dan preferensi privasi.

Field privasi yang tersimpan di model `User` (skema `nawasena_auth.prisma`):

| Field | Tipe | Default | Keterangan |
|---|---|---|---|
| `timeCapsuleShareDefault` | Boolean | `false` | Default berbagi entri Time Capsule baru |
| `lifeMapShareDefault` | Boolean | `false` | Default berbagi goal Life Map baru |
| `extendedRetention` | Int | `0` | Perpanjangan retensi data (0–3 tahun) |

## Key Components & Dependencies

- `FormWrapper`, `FormInput` dari `@/components/shared/FormWrapper`
- `DynamicBreadcrumb` dari `@/components/shared/DynamicBreadcrumb`
- `toast` dari `@/lib/toast`
- `createLogger` dari `@/lib/logger`
- API routes: `src/app/api/users/me/` dan `src/app/api/users/me/demographics/`

## Roles

Dapat diakses oleh semua pengguna yang sudah terautentikasi.
Halaman `setup/` hanya relevan saat status `PENDING_PROFILE_SETUP`.

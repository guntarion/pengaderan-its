# M10 — Safeguard & Insiden

Modul perlindungan peserta kaderisasi: pelaporan insiden, konsekuensi pedagogis, eskalasi otomatis ke Satgas, dan audit trail append-only. Dirancang untuk memastikan zero hukuman fisik/verbal/psikologis sesuai Permendikbudristek 55/2024.

See [FEATURES.md](./FEATURES.md) for the full feature catalogue.

## Architecture Decisions

### Append-Only Timeline via Database GRANT

`IncidentTimelineEntry` diproteksi dengan `REVOKE UPDATE, DELETE ON incident_timeline_entries FROM app_user` di migration SQL. Immutability ditegakkan di database layer, bukan application layer saja — ini mencegah bug atau manipulasi kode dari memodifikasi riwayat insiden secara retroaktif. Konsekuensinya: untuk "koreksi" timeline, harus ditambahkan entry baru dengan noteText yang menjelaskan koreksi.

### State Machine sebagai Pure Function

`src/lib/safeguard/state-machine.ts` tidak memiliki dependensi database. Semua validasi transisi dilakukan secara in-memory dari `TRANSITIONS` const. Ini memungkinkan 100% unit test coverage tanpa mock dan reuse di API layer maupun service layer tanpa circular dependency.

Setiap transisi dieksekusi dalam Prisma transaction: incident update + timeline entry atomik. Tidak ada cara transisi berhasil tanpa meninggalkan jejak di timeline.

### Role-Based Field Serializer

Field sensitif (identitas korban, resolution note, escalation reason, attachment keys) tidak pernah dikirim ke client sebelum melewati `serializeIncidentForViewer(incident, viewer)`. Ini memisahkan logika privacy dari API routes, memudahkan pengujian, dan mencegah PII leak jika endpoint baru ditambahkan.

Maba yang bukan reporter tidak mendapat akses ke detail insiden — 403 dijatuhkan di API level, bukan sekadar field dihilangkan.

### Triple-Layer Zero Hukuman Fisik

Tiga lapisan independen mencegah konsekuensi fisik/verbal/psikologis masuk:

1. **Enum** `ConsequenceType` di Prisma schema tidak memiliki nilai fisik. Komentar di schema secara eksplisit mencatat contoh yang dilarang.
2. **Zod** `createConsequenceSchema` memvalidasi bahwa `type` adalah salah satu dari 5 nilai yang diizinkan.
3. **UI** `ConsequenceTypePicker` menggunakan radio button dari enum — tidak ada text input bebas.
4. **EducationalBanner** permanen dan non-dismissible muncul di atas form assign consequence.

### Auto-Escalation: Fire-and-Forget dengan Fallback

`escalateIncident()` dipanggil via `Promise.allSettled()` setelah incident berhasil disimpan. Fungsi ini tidak pernah throw — semua error dilog. Dual-path:

1. Jika `M10_USE_M15=true`: panggil `sendNotification()` M15 dengan timeout 10 detik per receiver.
2. Jika M15 timeout/gagal: `dispatchFallbackForReceiver()` mengirim langsung via nodemailer + web-push.
3. Setiap fallback yang digunakan dicatat di tabel `SafeguardEscalationFallback` untuk monitoring.

Redis `SET NX` dengan TTL 30 menit mencegah duplicate escalation jika incident di-create ulang atau retry.

### M09 Cascade: In-Process Contract

`src/lib/safeguard/public-api.ts` adalah in-process API untuk M09 — tidak ada HTTP round-trip. M09 memanggil fungsi TypeScript langsung. Contract ini:
- Idempotent via Redis dedup `m10-cascade:{kpLogDailyId}` TTL 1 jam
- Fallback ke DB lookup jika Redis tidak tersedia
- Feature-flagged (`M09_M10_CASCADE_ENABLED=false` default) agar M10 bisa deploy sebelum M09 siap
- Insiden dari cascade masuk sebagai `PENDING_REVIEW` (draft), bukan langsung `OPEN`

### Satgas PDF: Server-Only Rendering

`@react-pdf/renderer` hanya berjalan di server. `satgas-export.ts` menggunakan `renderToBuffer()` yang merupakan Node.js API — jangan import file ini di client components. PDF disimpan ke S3 dengan key `safeguard/satgas-pdfs/{incidentId}/{timestamp}.pdf`. Signed URL TTL 7 hari. Fallback HTML print tersedia di `/incidents/[id]/print`.

### M05 Passport Cascade: Feature-Flagged

`POIN_PASSPORT_DIKURANGI` consequence memanggil M05 via `passport-cascade.ts` dengan retry 3x exponential backoff. Status dikembalikan ke `ConsequenceLog.passportCascadeStatus`. Default `M10_M05_PASSPORT_CASCADE_ENABLED=false` — flip ke `true` saat M05 sudah deployed dan stabil.

## Patterns & Conventions

### Incident Actor Type

`IncidentActor` di `types.ts` membawa `{ id, role, isSafeguardOfficer, organizationId }`. Selalu gunakan tipe ini di service layer, bukan session user langsung — ini memungkinkan system/cron calls dengan actor sintetis.

### File Organization di `src/lib/safeguard/`

```
state-machine.ts       — pure, no DB, fully unit testable
incident-service.ts    — DB orchestration + transaction wrapper
serializer.ts          — privacy filter, pure, unit testable
timeline.ts            — helper untuk recordTimelineEntry
escalation.ts          — fire-and-forget escalation engine
escalation-fallback.ts — direct nodemailer/web-push fallback
receivers.ts           — resolves SC + SG-Officer + Pembina
attachments.ts         — S3 presign/confirm/download + audit
satgas-export.ts       — @react-pdf/renderer server-only
public-api.ts          — M09 in-process contract
consequences/          — assign, submit, review, passport-cascade
__tests__/             — state-machine 100% coverage
```

### Polling vs WebSocket

Detail page menggunakan polling 15 detik (`POLL_INTERVAL_MS = 15_000`) bukan WebSocket untuk V1. Ini disengaja: menyederhanakan deployment dan tidak memerlukan sticky sessions. Upgrade ke Server-Sent Events dapat dilakukan di V2 tanpa mengubah API schema.

## Gotchas

- **Jangan import `satgas-export.ts` di client components** — `renderToBuffer` dari `@react-pdf/renderer` adalah Node.js API dan akan crash di browser.

- **`transitionStatus()` membutuhkan actor yang valid** — Pastikan actor memiliki `isSafeguardOfficer` yang akurat. Nilainya dibaca dari DB di setiap API handler; jangan gunakan nilai dari session token yang mungkin stale.

- **`escalateIncident()` tidak throw** — Ini disengaja. Periksa return value `EscalationResult` untuk mengetahui apakah escalation berhasil, bukan via try-catch.

- **ConsequenceLog tidak punya timeline sendiri** — Riwayat consequence (assign, submit, review) dicatat sebagai `CONSEQUENCE_ASSIGNED` entry di `IncidentTimelineEntry` incident terkait, bukan di tabel terpisah.

- **`PENDING_REVIEW` vs `OPEN`** — Insiden dari M09 cascade masuk sebagai `PENDING_REVIEW` (draft, belum visible ke semua role). SC/SG-Officer perlu transition ke `OPEN` sebelum incident bisa di-claim.

- **Pembina annotations disimpan sebagai JSON** — `pembinaAnnotations` adalah `Json?` field di `SafeguardIncident`, bukan tabel terpisah. Ini memudahkan query tapi tidak bisa diindeks.

## Security Considerations

- RLS diterapkan di 4 tabel (`safeguard_incidents`, `consequence_logs`, `incident_timeline_entries`, `safeguard_escalation_fallbacks`) dengan kebijakan `org_isolation` berdasarkan `app.current_org_id`.
- Timeline adalah satu-satunya tabel dengan `REVOKE UPDATE, DELETE` eksplisit.
- Download attachment selalu mencatat `ATTACHMENT_DOWNLOADED` timeline entry sebelum mengirimkan signed URL.
- `isSafeguardOfficer` boolean ditambahkan ke User via migration M10 standalone dengan index `@@index([organizationId, isSafeguardOfficer])`.

## Dependencies

### Depends On
- `prisma` — seluruh operasi DB via `@/utils/prisma`
- M15 Notifications — `sendNotification()` untuk escalation alerts
- M05 Passport — `passport-cascade.ts` untuk deduction sync (feature-flagged)
- Upstash Redis — dedup escalation, M09 cascade dedup
- AWS S3/DigitalOcean Spaces — attachment storage + Satgas PDF
- `@react-pdf/renderer` — server-side PDF generation
- `nodemailer` — escalation fallback email

### Depended By
- M09 KP Logbook — menggunakan `public-api.ts` untuk red flag cascade
- M13/M14 Dashboard — membaca incident aggregate untuk dashboard multi-role

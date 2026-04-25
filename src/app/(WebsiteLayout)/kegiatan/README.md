# Katalog Kegiatan — Public Module

Public-facing catalog of all pengaderan learning activities (kegiatan). Part of M02 master data. No authentication required.

## Route Structure

| Route | File | Purpose |
|---|---|---|
| `/kegiatan` | `page.tsx` | Filtered catalog grid |
| `/kegiatan/[id]` | `[id]/page.tsx` | Detail page for a single kegiatan |
| `/kegiatan/instance/[instanceId]` | `instance/[instanceId]/page.tsx` | Public detail for a specific event instance |

## Data Flow

- **Catalog page**: calls `getCatalogKegiatan()` from `src/lib/master-data/services/kegiatan.service.ts` server-side; passes filter params from URL search params.
- **Detail page**: calls `getKegiatanDetail(id, null)` and `getPublicUpcomingForKegiatan(id)` from `src/lib/event/services/instance.service.ts` in parallel.
- **Instance page**: calls `getPublicInstanceDetail(instanceId)` from `src/lib/event/services/instance.service.ts`.
- **ISR**: Both catalog and detail pages set `export const revalidate = 3600` (1 hour). Detail page also uses `generateStaticParams` to pre-render all `isActive && isGlobal` kegiatan at build time.

## Filter Parameters (URL Search Params)

| Param | Type | Values |
|---|---|---|
| `fase` | `FaseKey[]` | Prisma enum — phase of the cadre programme |
| `kategori` | `KategoriKey[]` | Activity category taxonomy |
| `nilai` | `NilaiKey[]` | Core values taxonomy |
| `intensity` | `KegiatanIntensity[]` | Prisma enum |
| `scale` | `KegiatanScale[]` | Prisma enum |

Multi-value params accepted as comma-separated string or repeated keys.

## Key Components

| Component | Source |
|---|---|
| `CatalogGrid` | `src/components/kegiatan/CatalogGrid.tsx` |
| `KegiatanFilter` | `src/components/kegiatan/KegiatanFilter.tsx` |
| `KegiatanDetailHero` | `src/components/kegiatan/KegiatanDetailHero.tsx` |
| `KegiatanTujuanList` | `src/components/kegiatan/KegiatanTujuanList.tsx` |
| `KegiatanKPITable` | `src/components/kegiatan/KegiatanKPITable.tsx` |
| `KegiatanAnchorList` | `src/components/kegiatan/KegiatanAnchorList.tsx` |
| `KegiatanPassportRelated` | `src/components/kegiatan/KegiatanPassportRelated.tsx` |
| `KegiatanPrasyaratLink` | `src/components/kegiatan/KegiatanPrasyaratLink.tsx` |
| `InstanceCardPublic` | `src/components/event/InstanceCardPublic.tsx` |
| `PublicInstanceHero` | `src/components/event/PublicInstanceHero.tsx` |
| `MarkdownRender` | `src/components/shared/MarkdownRender.tsx` |
| `SkeletonCardGrid` | `src/components/shared/skeletons/index.tsx` |

## SEO

- Catalog page: static `metadata` with OpenGraph title/description.
- Detail page: dynamic `generateMetadata` using kegiatan name and `deskripsiSingkat`.
- Instance page: dynamic `generateMetadata`.
- Error, loading, and not-found boundary files present at catalog level.

## Schema

Primary models: `Kegiatan`, `KegiatanTujuan`, `KegiatanKPIDef`, `KegiatanAnchor`, `KegiatanPassportItem` in `prisma/schema/nawasena_master.prisma`. Event instances in `prisma/schema/nawasena_event_instance.prisma`.

## Cross-reference

See [FEATURES.md](./FEATURES.md) for the user-facing capability catalog.

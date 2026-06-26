export type GalleryImage = {
  id: string
  /** Remote source (loads when network is available). */
  src: string
  /** CSS gradient fallback so the stage always renders, even offline. */
  fallback: string
  title: string
  subtitle: string
}

/**
 * Preset demo gallery. Uses picsum.photos seeded URLs so the set is stable
 * across reloads. Each entry carries a soft, on-brand gradient fallback that
 * shows while the photo loads (or if it can't be reached).
 */
export const IMAGES: GalleryImage[] = [
  {
    id: 'still-water',
    src: 'https://picsum.photos/seed/panarama-1/1200/800',
    fallback: 'linear-gradient(135deg, #eff2f9 0%, #b5bfc6 100%)',
    title: 'Still Water',
    subtitle: 'No. 01',
  },
  {
    id: 'soft-dunes',
    src: 'https://picsum.photos/seed/panarama-2/1200/800',
    fallback: 'linear-gradient(135deg, #e4ebf1 0%, #6e7f8d 100%)',
    title: 'Soft Dunes',
    subtitle: 'No. 02',
  },
  {
    id: 'low-tide',
    src: 'https://picsum.photos/seed/panarama-3/1200/800',
    fallback: 'linear-gradient(135deg, #b5bfc6 0%, #eff2f9 100%)',
    title: 'Low Tide',
    subtitle: 'No. 03',
  },
  {
    id: 'quiet-ridge',
    src: 'https://picsum.photos/seed/panarama-4/1200/800',
    fallback: 'linear-gradient(135deg, #6e7f8d 0%, #e4ebf1 100%)',
    title: 'Quiet Ridge',
    subtitle: 'No. 04',
  },
  {
    id: 'pale-horizon',
    src: 'https://picsum.photos/seed/panarama-5/1200/800',
    fallback: 'linear-gradient(135deg, #eff2f9 0%, #6e7f8d 100%)',
    title: 'Pale Horizon',
    subtitle: 'No. 05',
  },
]

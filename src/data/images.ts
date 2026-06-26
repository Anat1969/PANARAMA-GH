export type GalleryImage = {
  id: string
  /** Image source — an object URL (uploaded/pasted file) or a remote URL. */
  src: string
  /** CSS gradient fallback shown while the image loads / if it can't be reached. */
  fallback: string
  title: string
  subtitle: string
}

const FALLBACKS = [
  'linear-gradient(135deg, #eff2f9 0%, #b5bfc6 100%)',
  'linear-gradient(135deg, #e4ebf1 0%, #6e7f8d 100%)',
]

/** Wrap an image URL as a GalleryImage for the transition stage. */
export function imageFromUrl(
  src: string,
  title: string,
  subtitle: string,
  variant = 0,
): GalleryImage {
  return {
    id: `${title}-${src}`,
    src,
    fallback: FALLBACKS[variant % FALLBACKS.length],
    title,
    subtitle,
  }
}

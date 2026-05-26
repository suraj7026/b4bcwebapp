/**
 * Resolve a possibly-relative logoUrl from the API into a fully-qualified URL.
 *
 * The Django serializer returns:
 *   - null when there is no logo,
 *   - an absolute http(s) URL when MEDIA_BASE_URL is set on the backend, or
 *   - a relative path (e.g. "uploads/10_company_logo_1766063582.png") when the
 *     backend's MEDIA_BASE_URL is empty.
 *
 * For the relative case we prepend NEXT_PUBLIC_MEDIA_BASE_URL (defaulting to
 * the legacy CDN at https://b4bc.org/people/).
 */
const FALLBACK_BASE = "https://b4bc.org/people/";

export function resolveLogoUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const base = (
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? FALLBACK_BASE
  ).replace(/\/+$/, "");
  const trimmed = value.replace(/^\/+/, "");
  return `${base}/${trimmed}`;
}

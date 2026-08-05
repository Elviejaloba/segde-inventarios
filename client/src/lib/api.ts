export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://tasktrackerpro-api-production.up.railway.app";

export function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

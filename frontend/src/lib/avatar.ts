import { API_BASE_URL } from "@/lib/apiClient";

const DICEBEAR_BASE = "https://api.dicebear.com/9.x/initials/svg";

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:");
}

export function buildRandomAvatarUrl(seed: string): string {
  const safeSeed = encodeURIComponent(seed || "Emergency Health ID");
  return `${DICEBEAR_BASE}?seed=${safeSeed}&radius=50&fontWeight=700`;
}

export function resolveAvatarUrl(rawUrl: string | null | undefined, seed: string): string {
  if (!rawUrl) {
    return buildRandomAvatarUrl(seed);
  }

  if (isAbsoluteUrl(rawUrl)) {
    return rawUrl;
  }

  if (rawUrl.startsWith("/")) {
    return `${API_BASE_URL}${rawUrl}`;
  }

  return `${API_BASE_URL}/${rawUrl}`;
}

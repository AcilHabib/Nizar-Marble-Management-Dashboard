import { staffActorHeaders } from '@/lib/api-client';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export function resolveMarbleImageUrl(imageUrl: string | undefined | null): string {
  if (!imageUrl) return '';
  if (
    imageUrl.startsWith('http://') ||
    imageUrl.startsWith('https://') ||
    imageUrl.startsWith('blob:') ||
    imageUrl.startsWith('data:')
  ) {
    return imageUrl;
  }
  if (imageUrl.startsWith('/api/')) {
    const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
    if (apiBase.startsWith('http')) {
      return `${apiBase.replace(/\/api\/?$/, '')}${imageUrl}`;
    }
    return imageUrl;
  }
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base}attached_assets/${imageUrl.replace(/^\/+/, '')}`;
}

export async function uploadMarbleImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/uploads/marble-image`, {
    method: 'POST',
    headers: staffActorHeaders(),
    body: form,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? res.statusText);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

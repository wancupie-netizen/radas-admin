export function mediaURL(source: string) {
  return source.replace(/^\/media\//, '/sales-media/').replace(/^\/assets\//, '/sales-assets/');
}
export async function uploadImage(file: File): Promise<{ src: string }> {
  if (file.size <= 4 * 1024 * 1024) {
    const form = new FormData();
    form.append('image', file);
    const response = await fetch('/admin/api/upload', { method: 'POST', body: form });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }
  const signed = await fetch('/admin/api/upload/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: file.type, size: file.size }) });
  const upload = await signed.json() as { url?: string; key?: string; error?: string };
  if (!signed.ok || !upload.url || !upload.key) throw new Error(upload.error || 'Upload gagal dimulakan.');
  const response = await fetch(upload.url, { method: 'PUT', headers: { 'Content-Type': file.type, 'If-None-Match': '*' }, body: file });
  if (!response.ok) throw new Error('Upload ke storage gagal. Sila cuba semula.');
  const complete = await fetch('/admin/api/upload/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: upload.key }) });
  const result = await complete.json() as { src: string; error?: string };
  if (!complete.ok) throw new Error(result.error || 'Gambar gagal disahkan.');
  return result;
}

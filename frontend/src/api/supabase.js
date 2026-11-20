import api from './client';

// Admin photo uploads go to the shop's own server (stored on disk, served from /api/uploads/...).
// The file name is kept for existing imports; Supabase is no longer used.
export async function uploadImage(file) {
  if (file.size > 10 * 1024 * 1024) throw new Error('That image is over 10 MB. Please use a smaller one.');
  const body = new FormData();
  body.append('file', file);
  // Override the client's JSON default; axios then lets the browser set the multipart boundary.
  const { data } = await api.post('/api/admin/uploads', body, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data.url;
}

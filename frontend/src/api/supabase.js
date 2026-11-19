import { createClient } from '@supabase/supabase-js';

// Set these per environment (frontend/.env.production for the live site, frontend/.env.local for your machine).
// Leaving them out locally keeps test uploads from landing in the live storage bucket.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export async function uploadImage(file) {
  if (!supabase) {
    throw new Error('Image uploads are not configured here. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see frontend/.env).');
  }
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

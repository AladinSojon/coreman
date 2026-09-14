import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wcjmrzywvkyarydwspsp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjam1yenl3dmt5YXJ5ZHdzcHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNzExMjAsImV4cCI6MjEwNDk0NzEyMH0.NqIezhCUy0R493OItnRABv0FsSwCmMCMq7THUFBqZV4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadImage(file) {
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

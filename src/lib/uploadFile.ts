import { supabase } from './supabase';

/**
 * Upload a file to Supabase Storage and return the public URL.
 * Folders: 'logos', 'epi-images', 'audio', 'signatures', 'checklist-files'
 */
export async function uploadFile(
  file: File | Blob,
  folder: string
): Promise<string> {
  const ext = file instanceof File
    ? (file.name.split('.').pop() || 'bin')
    : (file.type.split('/')[1] || 'bin');
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from('uploads').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('uploads').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload a base64 data URL to Storage, returning the public URL.
 * If the input is already an http(s) URL, returns it as-is.
 * If upload fails (e.g. bucket missing), returns the original data URL so the
 * app keeps working — call site never sees a hard failure for optional assets.
 */
export async function uploadBase64(dataUrl: string, folder: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;

  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);/)?.[1] || 'application/octet-stream';
  const ext = mime.split('/')[1] || 'bin';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });

  try {
    return await uploadFile(blob, folder);
  } catch (err) {
    console.warn(`[uploadBase64:${folder}] Storage upload failed, keeping data URL:`, err);
    return dataUrl;
  }
}

/** Upload a File to Storage with silent fallback (returns data URL on failure). */
export async function safeUploadFile(file: File, folder: string): Promise<string> {
  try {
    return await uploadFile(file, folder);
  } catch (err) {
    console.warn(`[safeUploadFile:${folder}] Storage upload failed, reading as data URL:`, err);
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }
}

/** Delete a file from Storage by its public URL */
export async function deleteFile(url: string): Promise<void> {
  if (!url || !url.includes('/uploads/')) return;
  const path = url.split('/uploads/')[1];
  if (path) await supabase.storage.from('uploads').remove([decodeURIComponent(path)]);
}

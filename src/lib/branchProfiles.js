import { compressImage, fetchSetting, BUCKET } from './api';
import { saveSetting } from './adminApi';
import { supabase } from './supabase';

export const emptyBranchProfile = () => ({
  phone: '',
  address: '',
  show_address_on_documents: false,
  logo_url: '',
  stamp_url: '',
});

export async function fetchBranchProfiles() {
  const value = await fetchSetting('branch_profiles');
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export async function saveBranchProfiles(profiles) {
  return saveSetting('branch_profiles', profiles || {});
}

export async function getBranchProfile(branch) {
  const profiles = await fetchBranchProfiles();
  return { ...emptyBranchProfile(), ...(profiles[String(branch || '')] || {}) };
}

export async function uploadBranchAsset(file, branch, kind) {
  if (!file?.type?.startsWith('image/')) throw Error('اختر ملف صورة صحيحًا.');
  const compressed = await compressImage(file);
  const safeBranch = String(branch || 'branch').replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `branches/${safeBranch}/${kind}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

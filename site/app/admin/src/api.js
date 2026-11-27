import { createClient } from '@supabase/supabase-js';
import { demoRpc } from './demo.js';

/* global __SUPABASE_URL__, __SUPABASE_KEY__, __DEMO__ */

// Sesi admin disimpan di sessionStorage: menutup tab = keluar.
export const sb = createClient(__SUPABASE_URL__, __SUPABASE_KEY__, {
  auth: {
    storage: window.sessionStorage,
    storageKey: 'pk-admin-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

const MESSAGES = {
  not_admin: 'Akun ini tidak punya akses ke Admin Console.',
  mfa_required: 'Verifikasi kode autentikator diperlukan.',
  not_found: 'Data tidak ditemukan.',
  invalid_amount: 'Jumlah kredit harus 1–500.',
  invalid_input: 'Isian tidak valid.',
  invalid_status: 'Status tidak valid.',
  cannot_suspend_self: 'Akun admin sendiri tidak bisa dinonaktifkan.',
  rate_limited: 'Terlalu banyak permintaan. Coba lagi sebentar.',
};

export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export async function rpc(fn, args = {}) {
  if (__DEMO__) return demoRpc(fn, args);
  const { data, error } = await sb.rpc(fn, args);
  if (error) {
    const raw = `${error.message || ''} ${error.details || ''}`;
    const code = Object.keys(MESSAGES).find((k) => raw.includes(k));
    if (/JWT|jwt|401/.test(raw)) {
      throw new ApiError('session', 'Sesi berakhir. Silakan masuk lagi.');
    }
    throw new ApiError(code || 'error', code ? MESSAGES[code] : 'Terjadi kesalahan di server. Coba lagi.');
  }
  return data;
}

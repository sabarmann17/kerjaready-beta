const NUM = new Intl.NumberFormat('id-ID');
const DT = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
const DTT = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
const DM = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
const MONTH = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

export const num = (n) => NUM.format(Number(n) || 0);
export const rupiah = (n) => `Rp ${NUM.format(Math.round(Number(n) || 0))}`;
export function rupiahShort(n) {
  const v = Number(n) || 0;
  if (v >= 1e9) return `Rp ${(v / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  if (v >= 1e6) return `Rp ${(v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 })} jt`;
  return rupiah(v);
}
const d = (v) => (v ? new Date(v) : null);
export const date = (v) => (d(v) ? DT.format(d(v)) : '—');
export const dateTime = (v) => (d(v) ? DTT.format(d(v)) : '—');
export const dayMonth = (v) => (d(v) ? DM.format(d(v)) : '—');
export const monthName = (v) => (d(v) ? MONTH.format(d(v)) : '—');

export function ago(v) {
  const t = d(v);
  if (!t) return '—';
  const s = Math.max(0, (Date.now() - t.getTime()) / 1000);
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  if (s < 172800) return 'kemarin';
  if (s < 30 * 86400) return `${Math.floor(s / 86400)} hari lalu`;
  return date(v);
}

export function pct(part, total) {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

export const FEATURES = {
  polish: 'Rapikan deskripsi pengalaman',
  summary: 'Susun ringkasan diri',
  analyze_builder: 'Analisis CV (dari aplikasi)',
  analyze_pdf: 'Analisis CV (file PDF)',
  analyze_job: 'Baca syarat lowongan',
  apply_recommendations: 'Terapkan rekomendasi ke CV',
  import_cv: 'Impor CV lama',
  refund: 'Kredit dikembalikan (gagal)',
  topup: 'Top-up kredit dibeli',
};
export const feature = (f) => FEATURES[f] || f;

export const ACTIONS = {
  masuk_admin: 'Masuk Admin Console',
  masuk_ditolak: 'Percobaan masuk ditolak',
  lihat_pengguna: 'Melihat detail pengguna',
  tambah_kredit: 'Menambah kredit',
  reset_trial: 'Reset trial',
  nonaktifkan_akun: 'Menonaktifkan akun',
  aktifkan_akun: 'Mengaktifkan kembali akun',
  balas_tiket: 'Membalas tiket',
  ubah_status_tiket: 'Mengubah status tiket',
  simpan_draf_landing: 'Menyimpan draf landing',
  terbitkan_landing: 'Menerbitkan landing',
  pulihkan_landing: 'Memulihkan versi landing',
  akhiri_sesi: 'Mengakhiri sesi',
};
export const action = (a) => ACTIONS[a] || a;

// Tampilkan IP sebagian saja (cukup untuk mengenali, tidak penuh).
export function maskIp(ip) {
  if (!ip) return '—';
  const v4 = ip.split('.');
  if (v4.length === 4) return `${v4[0]}.${v4[1]}.x.${v4[3]}`;
  const v6 = ip.split(':');
  return v6.length > 2 ? `${v6.slice(0, 2).join(':')}:…` : ip;
}

export function device(ua) {
  if (!ua) return 'Perangkat tidak dikenal';
  const b = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /Dart/.test(ua) ? 'App Android' : 'Browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${b} · ${os}` : b;
}

import { sb, rpc } from './api.js';
import { h, icon, clear, mount, button } from './dom.js';

/* global __GOOGLE_CLIENT_ID__, __ADMIN_EMAIL_SHA256__ */

const LOCK_KEY = 'pk-admin-mfa-lock';
const FAIL_KEY = 'pk-admin-mfa-fail';
const MAX_FAIL = 5;
const LOCK_MS = 15 * 60 * 1000;

async function sha256hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomNonce() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function jwtPayload(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '='));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch {
    return null;
  }
}

function loadGsi() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('gsi'));
    document.head.append(s);
  });
}

function store(key, val) {
  try {
    if (val == null) localStorage.removeItem(key); else localStorage.setItem(key, String(val));
  } catch { /* abaikan */ }
}
function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function lockedUntil() {
  const v = Number(read(LOCK_KEY) || 0);
  return v > Date.now() ? v : 0;
}

function authLayout(root, panel) {
  mount(root, h('div', { class: 'auth' },
    h('aside', { class: 'auth-brand' },
      h('img', { src: 'brand/wordmark_white.png', alt: 'Potensiku', class: 'auth-logo', width: '186', height: '48' }),
      h('span', { class: 'auth-tag' }, 'Admin Console'),
      h('div', { class: 'auth-copy' },
        h('h2', null, 'Pusat kendali Potensiku.'),
        h('p', null, 'Pantau pengguna, paket, tagihan, dan tiket bantuan. Ubah teks landing page tanpa menyentuh kode.')),
      h('p', { class: 'auth-foot' }, 'Akses terbatas. Setiap upaya masuk dan tindakan admin dicatat.')),
    h('main', { class: 'auth-main' }, panel)));
}

function securityNote() {
  return h('div', { class: 'note' }, icon('shield', 18),
    h('span', null, 'Hanya akun admin terdaftar yang bisa masuk. Sesi berakhir setelah 30 menit tidak aktif atau saat tab ditutup.'));
}

export async function renderLogin(root, message, onSignedIn) {
  const msg = h('p', { class: 'auth-msg', role: 'alert' }, message || '');
  const host = h('div', { class: 'gsi-host' }, h('div', { class: 'loading' }, h('span', { class: 'spin' }), 'Memuat tombol Google…'));
  authLayout(root, h('div', { class: 'auth-form' },
    h('h1', null, 'Masuk sebagai admin'),
    h('p', { class: 'muted' }, 'Langkah 1 dari 2 — masuk dengan akun Google yang terdaftar sebagai admin.'),
    host, msg, securityNote()));

  try {
    await loadGsi();
  } catch {
    clear(host);
    msg.textContent = 'Tombol Google tidak bisa dimuat. Periksa koneksi, lalu muat ulang halaman.';
    return;
  }
  const raw = randomNonce();
  const hashed = await sha256hex(raw);
  window.google.accounts.id.initialize({
    client_id: __GOOGLE_CLIENT_ID__,
    nonce: hashed,
    context: 'signin',
    ux_mode: 'popup',
    use_fedcm_for_button: true,
    callback: async (resp) => {
      msg.textContent = '';
      const p = jwtPayload(resp.credential);
      const email = String(p?.email || '').toLowerCase();
      // Saring awal di browser agar akun lain tidak ikut terbuat; keputusan
      // akhir tetap di server (private.assert_admin).
      if (!email || (await sha256hex(email)) !== __ADMIN_EMAIL_SHA256__) {
        msg.textContent = 'Akun ini tidak punya akses ke Admin Console.';
        return;
      }
      mount(host, h('div', { class: 'loading' }, h('span', { class: 'spin' }), 'Memverifikasi akun…'));
      const { error } = await sb.auth.signInWithIdToken({ provider: 'google', token: resp.credential, nonce: raw });
      if (error) {
        msg.textContent = 'Gagal masuk. Muat ulang halaman lalu coba lagi.';
        return;
      }
      onSignedIn();
    },
  });
  clear(host);
  window.google.accounts.id.renderButton(host, {
    type: 'standard', theme: 'filled_blue', size: 'large', text: 'signin_with',
    shape: 'pill', logo_alignment: 'left', locale: 'id', width: 320,
  });
}

function otpInput(onFull) {
  const input = h('input', {
    class: 'otp', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6',
    pattern: '[0-9]*', 'aria-label': 'Kode autentikator 6 digit', placeholder: '••••••',
  });
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 6);
    if (input.value.length === 6) onFull(input.value);
  });
  return input;
}

export async function renderMfa(root, email, onDone, onSignOut) {
  const msg = h('p', { class: 'auth-msg', role: 'alert' });
  const body = h('div', { class: 'mfa-body' }, h('div', { class: 'loading' }, h('span', { class: 'spin' }), 'Menyiapkan verifikasi…'));
  const step1 = h('div', { class: 'step-done' },
    h('span', { class: 'ok-dot' }, icon('check', 14)),
    h('div', null, h('strong', null, 'Google terverifikasi'), h('span', null, email)),
    h('button', { class: 'link', type: 'button', onclick: onSignOut }, 'Ganti'));
  authLayout(root, h('div', { class: 'auth-form' },
    h('h1', null, 'Masuk sebagai admin'),
    h('p', { class: 'muted' }, 'Langkah 2 dari 2 — kode dari aplikasi autentikator.'),
    step1, body, msg, securityNote()));

  const { data: list, error } = await sb.auth.mfa.listFactors();
  if (error) {
    msg.textContent = 'Gagal memuat faktor keamanan. Muat ulang halaman.';
    return;
  }
  let factorId = list.totp.find((f) => f.status === 'verified')?.id;
  const enrolling = !factorId;
  clear(body);

  if (enrolling) {
    for (const f of (list.all || []).filter((x) => x.factor_type === 'totp' && x.status !== 'verified')) {
      await sb.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error: e2 } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Potensiku Admin' });
    if (e2) {
      msg.textContent = 'Gagal menyiapkan autentikator. Muat ulang halaman.';
      return;
    }
    factorId = data.id;
    body.append(
      h('h2', { class: 'h-step' }, 'Pasang aplikasi autentikator (sekali saja)'),
      h('ol', { class: 'steps' },
        h('li', null, 'Buka Google Authenticator, Microsoft Authenticator, atau 1Password di HP.'),
        h('li', null, 'Pindai kode QR ini, atau ketik kode rahasianya.'),
        h('li', null, 'Masukkan 6 digit yang muncul di aplikasi.')),
      h('div', { class: 'qr-row' },
        h('img', { class: 'qr', src: data.totp.qr_code, alt: 'Kode QR autentikator', width: '168', height: '168' }),
        h('div', { class: 'secret' }, h('span', null, 'Kode rahasia'), h('code', null, data.totp.secret))));
  } else {
    body.append(h('h2', { class: 'h-step' }, 'Kode autentikator'),
      h('p', { class: 'muted' }, 'Masukkan 6 digit dari aplikasi autentikator di HP-mu.'));
  }

  let busy = false;
  const submit = async (code) => {
    const until = lockedUntil();
    if (until) {
      msg.textContent = `Terlalu banyak percobaan salah. Coba lagi setelah ${new Date(until).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`;
      return;
    }
    if (busy || code.length !== 6) return;
    busy = true; go.disabled = true; msg.textContent = '';
    const { error: e3 } = await sb.auth.mfa.challengeAndVerify({ factorId, code });
    busy = false; go.disabled = false;
    if (e3) {
      const fails = Number(read(FAIL_KEY) || 0) + 1;
      store(FAIL_KEY, fails);
      if (fails >= MAX_FAIL) {
        store(LOCK_KEY, Date.now() + LOCK_MS);
        store(FAIL_KEY, null);
        msg.textContent = 'Terlalu banyak percobaan salah. Dikunci 15 menit.';
      } else {
        msg.textContent = `Kode salah atau kedaluwarsa. Sisa percobaan: ${MAX_FAIL - fails}.`;
      }
      input.value = '';
      input.focus();
      return;
    }
    store(FAIL_KEY, null);
    try { await rpc('admin_log_signin'); } catch { /* log gagal tidak menghalangi */ }
    onDone();
  };
  const input = otpInput(submit);
  const go = button('Masuk ke Admin Console', { kind: 'primary', icon: 'lock', onclick: () => submit(input.value) });
  go.classList.add('btn-block');
  body.append(input, go);
  input.focus();
}

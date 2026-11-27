import { sb, rpc } from './api.js';
import { h, icon, clear, mount, spinner, errorBox, toast } from './dom.js';
import { renderLogin, renderMfa } from './auth.js';
import { overviewPage } from './pages/overview.js';
import { usersPage, userDetailPage } from './pages/users.js';
import { billingPage } from './pages/billing.js';
import { supportPage } from './pages/support.js';
import { contentPage } from './pages/content.js';
import { securityPage } from './pages/security.js';
import { guard } from './ui.js';

/* global __DEMO__ */

const root = document.getElementById('root');
const IDLE_MS = 30 * 60 * 1000;

const NAV = [
  ['ringkasan', 'home', 'Ringkasan'],
  ['pengguna', 'users', 'Pengguna'],
  ['tagihan', 'receipt', 'Tagihan & invoice'],
  ['bantuan', 'chat', 'Bantuan pengguna'],
  ['konten', 'file', 'Konten landing'],
  ['keamanan', 'shield', 'Keamanan & log'],
];

let started = false;

async function signOut(message) {
  started = false;
  try { await sb.auth.signOut(); } catch { /* abaikan */ }
  try { sessionStorage.clear(); } catch { /* abaikan */ }
  history.replaceState(null, '', location.pathname);
  renderLogin(root, message, gate);
}

async function gate() {
  mount(root, h('div', { class: 'boot' }, spinner('Memeriksa akses…')));
  let who;
  try {
    who = await rpc('admin_whoami');
  } catch {
    return signOut('Sesi tidak valid. Silakan masuk lagi.');
  }
  if (!who?.is_admin) {
    return signOut('Akun ini tidak punya akses ke Admin Console.');
  }
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === 'aal2') return startApp(who);
  return renderMfa(root, who.email, () => startApp({ ...who, aal: 'aal2' }), () => signOut());
}

function watchIdle() {
  let last = Date.now();
  const bump = () => { last = Date.now(); };
  ['pointerdown', 'keydown', 'scroll', 'mousemove'].forEach((e) => window.addEventListener(e, bump, { passive: true }));
  setInterval(() => {
    if (started && Date.now() - last > IDLE_MS) signOut('Sesi berakhir karena 30 menit tidak aktif.');
  }, 30 * 1000);
}

function startApp(who) {
  started = true;
  const view = h('main', { class: 'view', id: 'view', tabindex: '-1' });
  const navEls = new Map();
  const nav = h('nav', { class: 'nav', 'aria-label': 'Menu admin' }, NAV.map(([id, ic, label]) => {
    const a = h('a', { href: `#/${id}`, class: 'nav-item' }, icon(ic, 20), h('span', null, label));
    navEls.set(id, a);
    return a;
  }));
  const side = h('aside', { class: 'side' },
    h('div', { class: 'side-brand' },
      h('img', { src: 'brand/wordmark_blue.png', alt: 'Potensiku', width: '140', height: '36' }),
      h('span', { class: 'console-chip' }, 'ADMIN CONSOLE')),
    nav,
    h('div', { class: 'side-spacer' }),
    h('div', { class: 'acct' },
      h('span', { class: 'avatar avatar-solid' }, (who.email || 'A')[0].toUpperCase()),
      h('div', { class: 'acct-text' }, h('strong', null, 'Admin'), h('span', null, who.email || '')),
      h('button', { class: 'icon-btn', type: 'button', title: 'Keluar', 'aria-label': 'Keluar', onclick: () => signOut('Kamu sudah keluar.') }, icon('logout', 18))));
  mount(root, h('div', { class: 'shell' }, side, view));

  const ctx = { view, who, go: (p) => { location.hash = `#/${p}`; }, signOut };
  let lastHash = location.hash;
  const route = async () => {
    if (guard.fn && !guard.fn()) {
      history.replaceState(null, '', lastHash);
      return;
    }
    guard.fn = null;
    window.onbeforeunload = null;
    lastHash = location.hash;
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const [page = 'ringkasan', arg] = parts;
    navEls.forEach((el, id) => el.classList.toggle('active', id === page));
    mount(view, spinner());
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    try {
      if (page === 'pengguna' && arg) await userDetailPage(ctx, decodeURIComponent(arg));
      else if (page === 'pengguna') await usersPage(ctx);
      else if (page === 'tagihan') await billingPage(ctx);
      else if (page === 'bantuan') await supportPage(ctx, arg ? Number(arg) : null);
      else if (page === 'konten') await contentPage(ctx);
      else if (page === 'keamanan') await securityPage(ctx);
      else await overviewPage(ctx);
    } catch (e) {
      if (e?.code === 'session' || e?.code === 'mfa_required' || e?.code === 'not_admin') {
        return signOut(e.message);
      }
      mount(view, errorBox(e?.message || 'Terjadi kesalahan.', route));
    }
  };
  window.onhashchange = route;
  route();
}

async function boot() {
  if (__DEMO__) {
    startApp({ email: 'admin@contoh.id', is_admin: true });
    toast('Mode demo: data fiktif, tidak terhubung ke server.', 'warn');
    return;
  }
  watchIdle();
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && started) signOut('Sesi berakhir. Silakan masuk lagi.');
  });
  const { data } = await sb.auth.getSession();
  if (data?.session) return gate();
  return renderLogin(root, '', gate);
}

boot();

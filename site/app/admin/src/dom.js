// Helper DOM kecil. Semua teks dimasukkan sebagai text node, tidak pernah
// sebagai HTML, sehingga data dari database tidak bisa menyisipkan script.

const SVG_NS = 'http://www.w3.org/2000/svg';

// Ikon (path statis dari kode ini sendiri, bukan dari data pengguna).
const ICONS = {
  home: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  eyeoff: '<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/>',
  dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
  pin: '<path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  hist: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
};

export function icon(name, size = 18) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICONS[name] || '';
  return svg;
}

const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'hidden']);

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (PROPS.has(k)) el[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, kids);
  return el;
}

export function append(el, kids) {
  for (const k of [kids].flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

// Kosongkan elemen lalu isi ulang (null/false diabaikan).
export function mount(el, ...kids) {
  clear(el);
  return append(el, kids);
}

// Komponen kecil yang dipakai di banyak halaman.
export const badge = (text, tone = 'blue') => h('span', { class: `badge badge-${tone}` }, text);

export function button(label, opts = {}) {
  const { icon: ic, kind = 'ghost', onclick, type = 'button', disabled, title, small } = opts;
  return h('button', {
    class: `btn btn-${kind}${small ? ' btn-sm' : ''}`, type, onclick, disabled, title,
  }, ic ? icon(ic, 16) : null, label ? h('span', null, label) : null);
}

export function card(title, opts = {}, ...kids) {
  const { extra, cls = '' } = opts;
  return h('section', { class: `card ${cls}` },
    title ? h('div', { class: 'card-head' }, h('h3', null, title), extra || null) : null,
    ...kids);
}

export function avatar(name, size = 32) {
  const letter = (String(name || '?').trim()[0] || '?').toUpperCase();
  return h('span', { class: 'avatar', style: { width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.4)}px` } }, letter);
}

export function empty(text, sub) {
  return h('div', { class: 'empty' }, h('strong', null, text), sub ? h('span', null, sub) : null);
}

export function spinner(label = 'Memuat…') {
  return h('div', { class: 'loading', role: 'status' }, h('span', { class: 'spin' }), label);
}

export function errorBox(message, retry) {
  return h('div', { class: 'error-box', role: 'alert' },
    icon('alert', 18), h('span', null, message),
    retry ? button('Coba lagi', { icon: 'refresh', onclick: retry, small: true }) : null);
}

export function table(cols, rows, opts = {}) {
  const { onRow, emptyText = 'Belum ada data.' } = opts;
  const head = h('tr', null, cols.map((c) => h('th', { style: c.width ? { width: c.width } : null }, c.label)));
  const body = h('tbody');
  if (!rows.length) {
    body.append(h('tr', null, h('td', { colspan: String(cols.length), class: 'td-empty' }, emptyText)));
  }
  for (const r of rows) {
    const tr = h('tr', onRow ? { class: 'clickable', tabindex: '0', onclick: () => onRow(r), onkeydown: (e) => { if (e.key === 'Enter') onRow(r); } } : null,
      cols.map((c) => h('td', { class: c.cls || null }, c.render ? c.render(r) : r[c.key] ?? '—')));
    body.append(tr);
  }
  return h('div', { class: 'table-wrap' }, h('table', null, h('thead', null, head), body));
}

export function select(options, value, onchange, label) {
  const s = h('select', { class: 'select', onchange: (e) => onchange(e.target.value), 'aria-label': label || null },
    options.map(([v, l]) => h('option', { value: v, selected: v === value }, l)));
  return s;
}

// Dialog modal sederhana (pengganti prompt/confirm bawaan browser).
export function modal({ title, body, confirmLabel = 'Simpan', danger = false, onConfirm }) {
  return new Promise((resolve) => {
    const err = h('div', { class: 'modal-error', role: 'alert' });
    const ok = button(confirmLabel, { kind: danger ? 'danger-solid' : 'primary' });
    const close = (v) => { overlay.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const cancel = button('Batal', { onclick: () => close(null) });
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    ok.addEventListener('click', async () => {
      ok.disabled = true; cancel.disabled = true; err.textContent = '';
      try {
        const v = onConfirm ? await onConfirm() : true;
        close(v === undefined ? true : v);
      } catch (e) {
        err.textContent = e.message || String(e);
        ok.disabled = false; cancel.disabled = false;
      }
    });
    const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('h3', null, title), body, err, h('div', { class: 'modal-actions' }, cancel, ok));
    const overlay = h('div', { class: 'overlay', onclick: (e) => { if (e.target === overlay) close(null); } }, box);
    document.body.append(overlay);
    document.addEventListener('keydown', onKey);
    const first = box.querySelector('input, textarea, select');
    (first || ok).focus();
  });
}

let toastTimer;
export function toast(text, tone = 'ok') {
  let t = document.getElementById('toast');
  if (!t) {
    t = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(t);
  }
  t.className = `toast toast-${tone} show`;
  t.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

export function debounce(fn, ms = 300) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// CSV aman: nilai yang diawali = + - @ diberi petik agar tidak dieksekusi
// sebagai rumus saat dibuka di Excel/Sheets.
export function downloadCsv(filename, header, rows) {
  const esc = (v) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

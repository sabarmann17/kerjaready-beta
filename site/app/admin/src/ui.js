import { h, icon } from './dom.js';

// Penjaga perpindahan halaman (mis. ada draf belum disimpan).
export const guard = { fn: null };

export function pageHead(title, sub, opts = {}) {
  const { right = [], back } = opts;
  return h('header', { class: 'page-head' },
    back ? h('a', { class: 'back-btn', href: back, 'aria-label': 'Kembali' }, icon('back', 18)) : null,
    h('div', { class: 'page-title' }, h('h1', null, title), sub ? h('p', null, sub) : null),
    h('div', { class: 'page-actions' }, right));
}

export function kpi(label, value, note, tone = 'muted') {
  return h('div', { class: 'kpi' },
    h('span', { class: 'kpi-label' }, label),
    h('strong', { class: 'kpi-value' }, value),
    note ? h('span', { class: `kpi-note tone-${tone}` }, note) : null);
}

export function bar(value, max, color) {
  const w = max > 0 ? Math.max(value > 0 ? 2 : 0, Math.round((value / max) * 100)) : 0;
  return h('span', { class: 'bar' }, h('span', { class: 'bar-fill', style: { width: `${w}%`, background: color || null } }));
}

export function kv(label, value) {
  return h('div', { class: 'kv' }, h('span', null, label), value instanceof Node ? value : h('strong', null, value ?? '—'));
}

export const PLAN_TONE = { Trial: 'gray', 'Trial selesai': 'gray', 'Belum klaim': 'gray', Beta: 'teal', Hemat: 'blue', Super: 'navy', Ekstra: 'teal' };
export const STATUS_TONE = { Aktif: 'green', Nonaktif: 'red', 'Belum aktif': 'amber' };
export const TICKET_TONE = { baru: 'red', diproses: 'amber', selesai: 'green' };
export const TICKET_LABEL = { baru: 'Baru', diproses: 'Diproses', selesai: 'Selesai' };
export const INVOICE_TONE = { lunas: 'green', menunggu: 'amber', gagal: 'red', kedaluwarsa: 'gray', refund: 'gray' };
export const INVOICE_LABEL = { lunas: 'Lunas', menunggu: 'Menunggu', gagal: 'Gagal', kedaluwarsa: 'Kedaluwarsa', refund: 'Refund' };

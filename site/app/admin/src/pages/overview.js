import { rpc } from '../api.js';
import { h, icon, clear, mount, card, badge, avatar, empty, select } from '../dom.js';
import { num, pct, rupiahShort, dayMonth, ago } from '../fmt.js';
import { pageHead, kpi, bar, TICKET_TONE, TICKET_LABEL } from '../ui.js';

let days = 30;

export async function overviewPage(ctx) {
  const d = await rpc('admin_overview', { p_days: days });
  const growth = d.new_prev_period
    ? `${d.new_period >= d.new_prev_period ? '+' : ''}${Math.round(((d.new_period - d.new_prev_period) / d.new_prev_period) * 100)}% vs periode lalu`
    : `${num(d.new_period)} pendaftar periode ini`;
  const revNote = d.revenue_prev_month
    ? `${d.revenue_month >= d.revenue_prev_month ? '+' : ''}${Math.round(((d.revenue_month - d.revenue_prev_month) / d.revenue_prev_month) * 100)}% vs bulan lalu`
    : 'Pembayaran aktif setelah masa beta';

  const range = select([['7', '7 hari terakhir'], ['30', '30 hari terakhir'], ['90', '90 hari terakhir']], String(days),
    (v) => { days = Number(v); overviewPage(ctx); }, 'Rentang waktu');

  // Grafik pendaftaran harian.
  const max = Math.max(1, ...d.signups.map((s) => s.count));
  const bars = h('div', { class: 'chart', role: 'img', 'aria-label': `Pendaftaran harian ${days} hari terakhir` },
    d.signups.map((s, i) => h('span', {
      class: `col${i === d.signups.length - 1 ? ' col-now' : ''}`,
      style: { height: `${Math.max(2, Math.round((s.count / max) * 100))}%` },
      title: `${dayMonth(s.day)}: ${num(s.count)} pendaftar`,
    })));
  const ticks = [0, Math.floor((d.signups.length - 1) / 3), Math.floor(((d.signups.length - 1) * 2) / 3), d.signups.length - 1];
  const axis = h('div', { class: 'axis' }, ticks.map((i) => h('span', null, dayMonth(d.signups[i]?.day))));

  const totalPlans = d.plans.reduce((a, p) => a + p.count, 0);
  const planColors = { Trial: '#B9C8F5', Beta: '#27B6A5', Hemat: '#3157D5', Super: '#14213D', Ekstra: '#27B6A5' };
  const plans = d.plans.length ? d.plans.map((p) => h('div', { class: 'plan-row' },
    h('div', { class: 'plan-top' }, h('span', null, p.plan), h('strong', null, `${num(p.count)} · ${pct(p.count, totalPlans)}`)),
    bar(p.count, totalPlans, planColors[p.plan] || '#C9D3EA'))) : [empty('Belum ada pengguna.')];

  const cmax = Math.max(1, ...d.cities.map((c) => c.count));
  const cities = d.cities.length ? d.cities.map((c) => h('div', { class: 'city-row' },
    icon('pin', 16), h('span', { class: 'city-name' }, c.city), bar(c.count, cmax), h('strong', null, num(c.count))))
    : [empty('Belum ada data kota.', 'Kota diambil dari profil yang diisi pengguna.')];

  const tickets = d.tickets.length ? d.tickets.map((t) => h('a', { class: 'ticket-row', href: `#/bantuan/${t.id}` },
    avatar(t.name), h('div', { class: 'grow' }, h('strong', null, t.name || 'Pengguna'), h('span', null, t.subject)),
    h('span', { class: 'muted small' }, ago(t.updated_at)), badge(TICKET_LABEL[t.status], TICKET_TONE[t.status])))
    : [empty('Tidak ada tiket terbuka.', 'Laporan dari tombol "Laporkan masalah" di app muncul di sini.')];

  mount(ctx.view, 
    pageHead('Ringkasan', `Kondisi Potensiku ${days} hari terakhir`, { right: [range] }),
    h('div', { class: 'grid-4' },
      kpi('Total pengguna', num(d.total_users), `+${num(d.new_7d)} minggu ini`, 'green'),
      kpi('Aktif 7 hari', num(d.active_7d), `${pct(d.active_7d, d.total_users)} dari total`),
      kpi('Kredit AI terpakai', num(d.credits_period), `${num(d.ai_requests_period)} permintaan AI`),
      kpi('Pendapatan bulan ini', rupiahShort(d.revenue_month), revNote, d.revenue_month ? 'green' : 'muted')),
    h('div', { class: 'grid-main' },
      card('Pendaftaran harian', { extra: h('span', { class: 'tone-green small strong' }, growth) }, bars, axis),
      card('Paket pengguna', { cls: 'side-card' }, ...plans)),
    h('div', { class: 'grid-2' },
      card('Kota teratas', { extra: h('span', { class: 'muted small' }, 'dari profil pengguna') }, ...cities),
      card('Tiket bantuan terbuka', {
        extra: d.new_tickets ? badge(`${d.new_tickets} baru`, 'red') : null,
      }, ...tickets, h('a', { class: 'more-link', href: '#/bantuan' }, 'Buka semua tiket', icon('arrow', 16)))));
}

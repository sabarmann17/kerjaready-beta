import { rpc } from '../api.js';
import { h, icon, clear, mount, card, badge, empty, table, select, button, debounce, downloadCsv, toast } from '../dom.js';
import { num, rupiah, rupiahShort, dayMonth, dateTime, monthName } from '../fmt.js';
import { pageHead, kpi, kv, INVOICE_TONE, INVOICE_LABEL } from '../ui.js';

const state = { month: '', status: '', q: '' };

function monthOptions() {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < 12; i++) {
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    out.push([v, monthName(`${v}T12:00:00`)]);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

const METHOD = { google_play: 'Google Play' };

export async function billingPage(ctx) {
  const months = monthOptions();
  if (!state.month) state.month = months[0][0];
  const args = () => ({ p_search: state.q || null, p_status: state.status || null, p_month: state.month, p_limit: 200, p_offset: 0 });
  const d = await rpc('admin_invoices', args());

  const drawer = h('aside', { class: 'drawer', hidden: true });
  const openDrawer = (r) => {
    drawer.hidden = false;
    mount(drawer, 
      h('div', { class: 'drawer-head' }, h('h3', null, r.number),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Tutup', onclick: () => { drawer.hidden = true; } }, icon('x', 18))),
      badge(INVOICE_LABEL[r.status], INVOICE_TONE[r.status]),
      kv('Pengguna', r.name || '—'), kv('Email', r.email || '—'), kv('Tanggal', dateTime(r.created_at)),
      kv('Metode', METHOD[r.method] || r.method), kv('ID transaksi', r.provider_ref || '—'),
      h('hr'), kv(r.item, rupiah(r.amount_idr)), kv('Potongan penyedia', `− ${rupiah(r.fee_idr)}`),
      h('hr'), kv('Diterima', rupiah(r.amount_idr - r.fee_idr)));
  };

  const body = h('div', { class: 'with-drawer' });
  const render = (data) => {
    const cols = [
      { label: 'No. invoice', width: '150px', cls: 'strong', render: (r) => r.number },
      { label: 'Pengguna', render: (r) => r.name || r.email || '—' },
      { label: 'Item', width: '150px', render: (r) => r.item },
      { label: 'Jumlah', width: '110px', render: (r) => rupiah(r.amount_idr) },
      { label: 'Tanggal', width: '90px', render: (r) => dayMonth(r.created_at) },
      { label: 'Status', width: '100px', render: (r) => badge(INVOICE_LABEL[r.status], INVOICE_TONE[r.status]) },
    ];
    mount(body, 
      h('div', { class: 'grow' }, data.rows.length
        ? table(cols, data.rows, { onRow: openDrawer })
        : card(null, {}, empty('Belum ada transaksi di bulan ini.', 'Pembayaran paket aktif setelah masa beta. Invoice dari Google Play akan otomatis muncul di sini.'))),
      drawer);
  };
  const reload = async () => { drawer.hidden = true; render(await rpc('admin_invoices', args())); };
  const setF = (k) => (v) => { state[k] = v; reload(); };
  const search = h('input', { class: 'input', type: 'search', placeholder: 'Cari no. invoice atau email', value: state.q, 'aria-label': 'Cari invoice' });
  search.addEventListener('input', debounce(() => setF('q')(search.value.trim()), 350));

  const exportCsv = async () => {
    const data = await rpc('admin_invoices', args());
    downloadCsv(`potensiku-invoice-${state.month.slice(0, 7)}.csv`,
      ['No. invoice', 'Nama', 'Email', 'Item', 'Jumlah', 'Potongan', 'Diterima', 'Metode', 'ID transaksi', 'Status', 'Tanggal'],
      data.rows.map((r) => [r.number, r.name, r.email, r.item, r.amount_idr, r.fee_idr, r.amount_idr - r.fee_idr, METHOD[r.method] || r.method, r.provider_ref || '', INVOICE_LABEL[r.status], r.created_at]));
    toast(`${num(data.rows.length)} invoice diekspor.`);
  };

  mount(ctx.view, 
    pageHead('Tagihan & invoice', 'Pembayaran lewat Google Play Billing', {
      right: [select(months, state.month, setF('month'), 'Bulan'), button('Ekspor CSV', { icon: 'dl', onclick: exportCsv, disabled: !d.total })],
    }),
    h('div', { class: 'grid-4' },
      kpi('Pendapatan bersih', rupiahShort(d.net), 'setelah potongan penyedia'),
      kpi('Invoice lunas', num(d.paid), monthName(`${d.month}T12:00:00`)),
      kpi('Langganan aktif', num(d.active_subs), 'saat ini'),
      kpi('Refund / gagal', num(d.problem), d.problem ? 'perlu dicek' : 'aman', d.problem ? 'red' : 'muted')),
    h('div', { class: 'filters' },
      h('label', { class: 'search' }, icon('search', 16), search),
      select([['', 'Status: Semua'], ['lunas', 'Lunas'], ['menunggu', 'Menunggu'], ['gagal', 'Gagal'], ['kedaluwarsa', 'Kedaluwarsa'], ['refund', 'Refund']], state.status, setF('status'), 'Filter status')),
    body);
  render(d);
}

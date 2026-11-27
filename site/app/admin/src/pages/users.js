import { rpc } from '../api.js';
import { h, icon, clear, mount, card, badge, avatar, empty, table, select, button, modal, toast, debounce, downloadCsv } from '../dom.js';
import { num, date, dateTime, ago, feature, rupiah, device } from '../fmt.js';
import { pageHead, kpi, kv, bar, PLAN_TONE, STATUS_TONE, TICKET_TONE, TICKET_LABEL, INVOICE_TONE, INVOICE_LABEL } from '../ui.js';

const PAGE = 25;
const state = { q: '', plan: '', status: '', city: '', page: 0 };

const filtersArgs = (limit, offset) => ({
  p_search: state.q || null, p_plan: state.plan || null, p_status: state.status || null,
  p_city: state.city || null, p_limit: limit, p_offset: offset,
});

export async function usersPage(ctx) {
  const d = await rpc('admin_users', filtersArgs(PAGE, state.page * PAGE));
  const body = h('div');
  const render = (data) => {
    const pages = Math.max(1, Math.ceil(data.total / PAGE));
    const cols = [
      { label: 'Pengguna', render: (r) => h('div', { class: 'who' }, avatar(r.name), h('div', null, h('strong', null, r.name), h('span', null, r.email))) },
      { label: 'Paket', width: '120px', render: (r) => badge(r.plan, PLAN_TONE[r.plan] || 'gray') },
      { label: 'Kredit terpakai', width: '120px', render: (r) => num(r.credits_used) + (r.topup ? ` (+${num(r.topup)})` : '') },
      { label: 'Kota', width: '120px', render: (r) => r.city || '—' },
      { label: 'Bergabung', width: '120px', render: (r) => date(r.joined) },
      { label: 'Terakhir aktif', width: '120px', render: (r) => ago(r.last_active) },
      { label: 'Status', width: '110px', render: (r) => badge(r.status, STATUS_TONE[r.status] || 'gray') },
    ];
    const pager = h('div', { class: 'pager' },
      h('span', { class: 'muted' }, data.total ? `Menampilkan ${num(state.page * PAGE + 1)}–${num(Math.min(data.total, (state.page + 1) * PAGE))} dari ${num(data.total)}` : 'Tidak ada hasil'),
      h('div', { class: 'pager-btns' },
        button('', { icon: 'back', small: true, disabled: state.page === 0, title: 'Sebelumnya', onclick: () => { state.page -= 1; reload(); } }),
        h('span', { class: 'pager-num' }, `${state.page + 1} / ${pages}`),
        button('', { icon: 'arrow', small: true, disabled: state.page + 1 >= pages, title: 'Berikutnya', onclick: () => { state.page += 1; reload(); } })));
    mount(body, 
      table(cols, data.rows, { onRow: (r) => ctx.go(`pengguna/${r.id}`), emptyText: 'Tidak ada pengguna yang cocok dengan filter.' }),
      pager);
  };
  const reload = async () => {
    body.style.opacity = '0.55';
    try { render(await rpc('admin_users', filtersArgs(PAGE, state.page * PAGE))); } finally { body.style.opacity = ''; }
  };
  const setF = (k) => (v) => { state[k] = v; state.page = 0; reload(); };

  const search = h('input', { class: 'input', type: 'search', placeholder: 'Cari nama atau email', value: state.q, 'aria-label': 'Cari pengguna' });
  search.addEventListener('input', debounce(() => setF('q')(search.value.trim()), 350));

  const exportCsv = async () => {
    const all = [];
    for (let off = 0; off < 5000; off += 100) {
      const part = await rpc('admin_users', filtersArgs(100, off));
      all.push(...part.rows);
      if (part.rows.length < 100) break;
    }
    downloadCsv(`potensiku-pengguna-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Nama', 'Email', 'Paket', 'Status', 'Kota', 'Kredit terpakai', 'Saldo top-up', 'Bergabung', 'Terakhir aktif'],
      all.map((r) => [r.name, r.email, r.plan, r.status, r.city || '', r.credits_used, r.topup, r.joined, r.last_active || '']));
    toast(`${num(all.length)} pengguna diekspor.`);
  };

  mount(ctx.view, 
    pageHead('Pengguna', `${num(d.total)} akun terdaftar`, { right: [button('Ekspor CSV', { icon: 'dl', onclick: exportCsv })] }),
    h('div', { class: 'filters' },
      h('label', { class: 'search' }, icon('search', 16), search),
      select([['', 'Paket: Semua'], ...d.plans.map((p) => [p, p])], state.plan, setF('plan'), 'Filter paket'),
      select([['', 'Status: Semua'], ['Aktif', 'Aktif'], ['Belum aktif', 'Belum aktif'], ['Nonaktif', 'Nonaktif']], state.status, setF('status'), 'Filter status'),
      select([['', 'Kota: Semua'], ...d.cities.map((c) => [c, c])], state.city, setF('city'), 'Filter kota')),
    body);
  render(d);
}

async function addCredits(user, after) {
  const amount = h('input', { class: 'input', type: 'number', min: '1', max: '500', value: '10', 'aria-label': 'Jumlah kredit' });
  const note = h('input', { class: 'input', type: 'text', maxlength: '200', placeholder: 'Catatan (mis. kompensasi tiket #52)', 'aria-label': 'Catatan' });
  const ok = await modal({
    title: `Tambah kredit untuk ${user.name}`,
    body: h('div', { class: 'form' },
      h('label', null, 'Jumlah kredit (1–500)', amount),
      h('label', null, 'Catatan', note),
      h('p', { class: 'muted small' }, 'Kredit masuk ke saldo top-up dan dipakai setelah kuota paket habis.')),
    confirmLabel: 'Tambah kredit',
    onConfirm: async () => {
      const n = Number(amount.value);
      if (!Number.isInteger(n) || n < 1 || n > 500) throw new Error('Jumlah kredit harus 1–500.');
      return rpc('admin_add_credits', { p_user: user.id, p_amount: n, p_note: note.value.trim() || null });
    },
  });
  if (ok != null) { toast(`Kredit ditambahkan. Saldo top-up sekarang ${num(ok)}.`); after(); }
}

async function resetTrial(user, after) {
  const ok = await modal({
    title: 'Reset trial?',
    body: h('p', null, `${user.name} akan mendapat trial baru (12 kredit sekali pakai) mulai hari ini.`),
    confirmLabel: 'Reset trial',
    onConfirm: () => rpc('admin_reset_trial', { p_user: user.id }),
  });
  if (ok != null) { toast('Trial direset.'); after(); }
}

async function toggleSuspend(user, after) {
  const suspend = !user.suspended;
  const reason = h('textarea', { class: 'input', rows: '3', maxlength: '300', placeholder: 'Alasan (dicatat di log audit)', 'aria-label': 'Alasan' });
  const ok = await modal({
    title: suspend ? `Nonaktifkan akun ${user.name}?` : `Aktifkan kembali ${user.name}?`,
    body: h('div', { class: 'form' },
      h('p', null, suspend
        ? 'Pengguna langsung keluar dari semua perangkat, tidak bisa masuk lagi, dan tidak bisa memakai AI. Data mereka tidak dihapus.'
        : 'Pengguna bisa masuk dan memakai Potensiku lagi.'),
      suspend ? h('label', null, 'Alasan', reason) : null),
    confirmLabel: suspend ? 'Nonaktifkan' : 'Aktifkan',
    danger: suspend,
    onConfirm: async () => {
      if (suspend && reason.value.trim().length < 3) throw new Error('Tulis alasan singkat.');
      return rpc('admin_set_suspended', { p_user: user.id, p_suspended: suspend, p_reason: reason.value.trim() || null });
    },
  });
  if (ok != null) { toast(suspend ? 'Akun dinonaktifkan.' : 'Akun diaktifkan kembali.'); after(); }
}

export async function userDetailPage(ctx, id) {
  const d = await rpc('admin_user_detail', { p_user: id });
  const u = d.user;
  const e = d.entitlement || {};
  const reload = () => userDetailPage(ctx, id);
  const isSelf = u.email === ctx.who.email;

  const limit = Number(e.limit) || 0;
  const used = Number(e.used) || 0;
  const left = Math.max(0, limit - used);
  const periodLabel = e.period === 'once' ? 'sekali pakai' : e.period === 'month' ? 'per bulan' : 'per hari';

  const usage = d.usage.length ? table([
    { label: 'Waktu', width: '150px', render: (r) => dateTime(r.created_at) },
    { label: 'Fitur', render: (r) => feature(r.feature) },
    { label: 'Kredit', width: '80px', render: (r) => (r.cost > 0 ? num(r.cost) : `+${num(-r.cost)}`) },
    { label: 'Hasil', width: '120px', render: (r) => (r.cost > 0 ? badge('Terpakai', 'green') : badge('Dikembalikan', 'gray')) },
  ], d.usage) : empty('Belum ada pemakaian AI tercatat.', 'Pencatatan per pengguna dimulai 27 Nov 2026.');

  mount(ctx.view, 
    pageHead(u.name, `${u.email} · masuk dengan Google`, {
      back: '#/pengguna',
      right: [
        button('Tambah kredit', { icon: 'plus', kind: 'primary', onclick: () => addCredits(u, reload) }),
        button('Reset trial', { icon: 'reset', onclick: () => resetTrial(u, reload) }),
        isSelf ? null : button(u.suspended ? 'Aktifkan' : 'Nonaktifkan', { icon: 'ban', kind: u.suspended ? 'ghost' : 'danger', onclick: () => toggleSuspend(u, reload) }),
      ],
    }),
    u.suspended ? h('div', { class: 'banner banner-red' }, icon('ban', 18), h('span', null, `Akun nonaktif${d.suspend_reason ? ` — ${d.suspend_reason}` : ''}.`)) : null,
    h('div', { class: 'detail' },
      h('div', { class: 'detail-side' },
        card('Profil', {},
          kv('Paket', badge(u.plan, PLAN_TONE[u.plan] || 'gray')),
          kv('Status', badge(u.status, STATUS_TONE[u.status] || 'gray')),
          kv('Kota', u.city || '—'),
          kv('Posisi tujuan', u.target_role || '—'),
          kv('Bergabung', dateTime(u.joined)),
          kv('Terakhir aktif', ago(u.last_active)),
          kv('Perangkat terakhir', d.last_client ? device(d.last_client) : '—'),
          kv('Tester beta', d.beta ? 'Ya' : 'Tidak'),
          h('div', { class: 'note note-gray' }, icon('eyeoff', 16), h('span', null, 'Isi CV dan detail pengalaman tidak ditampilkan untuk menjaga privasi pengguna.'))),
        card('Kredit AI', { extra: e.resets_at ? h('span', { class: 'muted small' }, `reset ${date(e.resets_at)}`) : null },
          h('div', { class: 'big-num' }, h('strong', null, num(left)), h('span', null, `dari ${num(limit)} tersisa · ${periodLabel}`)),
          bar(left, limit || 1),
          h('p', { class: 'muted small' }, `Top-up: ${num(e.topup_balance || 0)} · total terpakai: ${num(u.credits_used)}`))),
      h('div', { class: 'detail-main' },
        h('div', { class: 'grid-3' },
          kpi('Analisis CV', num(d.stats.analyses_30d), '30 hari'),
          kpi('CV dibuat', num(d.stats.cvs), 'total'),
          kpi('Saran diterapkan', num(d.stats.recs_applied), `${num(d.stats.exports)} kali ekspor PDF`)),
        card('Pemakaian AI terbaru', {}, usage),
        h('div', { class: 'grid-2' },
          card('Invoice', {}, d.invoices.length ? d.invoices.map((i) => h('div', { class: 'list-row' },
            h('div', { class: 'grow' }, h('strong', null, i.number), h('span', null, `${date(i.created_at)} · ${i.item} · ${rupiah(i.amount_idr)}`)),
            badge(INVOICE_LABEL[i.status], INVOICE_TONE[i.status]))) : empty('Belum ada invoice.')),
          card('Tiket bantuan', {}, d.tickets.length ? d.tickets.map((t) => h('a', { class: 'list-row', href: `#/bantuan/${t.id}` },
            h('div', { class: 'grow' }, h('strong', null, `#T-${String(t.id).padStart(4, '0')} · ${t.subject}`), h('span', null, ago(t.updated_at))),
            badge(TICKET_LABEL[t.status], TICKET_TONE[t.status]))) : empty('Belum ada tiket.'))))),
  );
}

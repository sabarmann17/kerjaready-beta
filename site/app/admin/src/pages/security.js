import { rpc, sb } from '../api.js';
import { h, icon, clear, mount, card, badge, empty, table, select, button, modal, toast, downloadCsv } from '../dom.js';
import { num, dateTime, ago, action, ACTIONS, maskIp, device } from '../fmt.js';
import { pageHead } from '../ui.js';

const PROTECTIONS = [
  'Login Google, hanya email admin terdaftar (dicek di server, bukan di browser)',
  'Kode autentikator (MFA) wajib di setiap sesi',
  'Hak admin diperiksa di database untuk setiap permintaan; kunci rahasia tidak pernah ada di browser',
  'Percobaan kode dibatasi: 5 kali salah → dikunci 15 menit',
  'Sesi berakhir setelah 30 menit tidak aktif atau saat tab ditutup',
  'Halaman admin tidak diindeks mesin pencari; header keamanan ketat (CSP, anti-iframe)',
  'Semua tindakan admin dicatat dan log tidak bisa diubah atau dihapus',
];

const state = { action: '', page: 0 };
const PAGE = 50;

export async function securityPage(ctx) {
  const [sessions, audit] = await Promise.all([
    rpc('admin_sessions'),
    rpc('admin_audit', { p_action: state.action || null, p_limit: PAGE, p_offset: state.page * PAGE }),
  ]);

  const endSession = async (s) => {
    const ok = await modal({
      title: 'Akhiri sesi ini?', body: h('p', null, `${device(s.user_agent)} akan keluar dari Admin Console.`),
      confirmLabel: 'Akhiri sesi', danger: true, onConfirm: () => rpc('admin_end_session', { p_session: s.id }),
    });
    if (ok != null) { toast('Sesi diakhiri.'); securityPage(ctx); }
  };
  const signOutAll = async () => {
    const ok = await modal({
      title: 'Keluar dari semua sesi?', body: h('p', null, 'Semua perangkat (termasuk yang ini) akan keluar dari Admin Console.'),
      confirmLabel: 'Keluar semua', danger: true,
      onConfirm: async () => { await sb.auth.signOut({ scope: 'global' }); },
    });
    if (ok != null) ctx.signOut('Kamu sudah keluar dari semua sesi.');
  };

  const sessRows = sessions.length ? sessions.map((s) => h('div', { class: 'sess' },
    icon(/iPhone|Android|Mobile/.test(s.user_agent || '') ? 'phone' : 'monitor', 20),
    h('div', { class: 'grow' }, h('strong', null, device(s.user_agent)), h('span', null, `${maskIp(s.ip)} · aktif ${ago(s.last_seen)}${s.aal === 'aal2' ? '' : ' · belum MFA'}`)),
    s.current ? badge('Sesi ini', 'green') : h('button', { type: 'button', class: 'link danger', onclick: () => endSession(s) }, 'Akhiri')))
    : [empty('Tidak ada sesi.')];

  const cols = [
    { label: 'Waktu', width: '140px', render: (r) => dateTime(r.created_at) },
    { label: 'Pelaku', width: '200px', render: (r) => (r.outcome === 'denied' ? badge('Ditolak', 'red') : r.actor_email || '—') },
    { label: 'Tindakan', render: (r) => action(r.action) + (r.detail?.jumlah ? ` (${num(r.detail.jumlah)})` : '') + (r.detail?.status ? ` → ${r.detail.status}` : '') },
    { label: 'Target', width: '200px', render: (r) => r.target_label || (r.outcome === 'denied' ? r.actor_email : '—') || '—' },
    { label: 'IP', width: '120px', render: (r) => maskIp(r.ip) },
  ];

  const exportCsv = async () => {
    const all = [];
    for (let off = 0; off < 5000; off += 200) {
      const part = await rpc('admin_audit', { p_action: state.action || null, p_limit: 200, p_offset: off });
      all.push(...part.rows);
      if (part.rows.length < 200) break;
    }
    downloadCsv(`potensiku-log-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Waktu', 'Pelaku', 'Tindakan', 'Target', 'Hasil', 'IP'],
      all.map((r) => [r.created_at, r.actor_email || '', action(r.action), r.target_label || '', r.outcome, r.ip || '']));
    toast(`${num(all.length)} baris log diekspor.`);
  };

  mount(ctx.view, 
    pageHead('Keamanan & log', 'Perlindungan Admin Console dan jejak setiap tindakan', {
      right: [button('Keluar dari semua sesi', { icon: 'logout', kind: 'danger', onclick: signOutAll })],
    }),
    h('div', { class: 'grid-main' },
      card('Perlindungan aktif', { extra: badge(`${PROTECTIONS.length}/${PROTECTIONS.length} aktif`, 'green') },
        h('ul', { class: 'checks' }, PROTECTIONS.map((p) => h('li', null, h('span', { class: 'ok-dot' }, icon('check', 13)), p)))),
      card('Sesi aktif', { cls: 'side-card' }, ...sessRows,
        audit.denied_today ? h('div', { class: 'note note-amber' }, icon('alert', 16),
          h('span', null, `${num(audit.denied_today)} percobaan masuk ditolak hari ini dari akun yang tidak terdaftar.`)) : null)),
    h('div', { class: 'section-head' }, h('h2', null, 'Log audit'),
      select([['', 'Semua tindakan'], ...Object.entries(ACTIONS)], state.action, (v) => { state.action = v; state.page = 0; securityPage(ctx); }, 'Filter tindakan'),
      button('Ekspor', { icon: 'dl', onclick: exportCsv })),
    table(cols, audit.rows, { emptyText: 'Belum ada catatan.' }),
    h('div', { class: 'pager' }, h('span', { class: 'muted' }, `Halaman ${state.page + 1}`),
      h('div', { class: 'pager-btns' },
        button('', { icon: 'back', small: true, disabled: state.page === 0, title: 'Sebelumnya', onclick: () => { state.page -= 1; securityPage(ctx); } }),
        button('', { icon: 'arrow', small: true, disabled: audit.rows.length < PAGE, title: 'Berikutnya', onclick: () => { state.page += 1; securityPage(ctx); } }))));
}

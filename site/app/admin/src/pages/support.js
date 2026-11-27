import { rpc } from '../api.js';
import { h, icon, clear, mount, card, badge, avatar, empty, button, select, toast, modal } from '../dom.js';
import { num, date, dateTime, ago } from '../fmt.js';
import { pageHead, kv, PLAN_TONE, TICKET_TONE, TICKET_LABEL } from '../ui.js';

const state = { tab: 'baru' };
const code = (id) => `#T-${String(id).padStart(4, '0')}`;

const TEMPLATES = [
  ['Trial habis', 'Halo, terima kasih sudah mencoba Potensiku. Trial memang sekali pakai (12 kredit). Kami sudah menambahkan kredit bonus ke akunmu supaya kamu bisa menyelesaikan prosesnya. Semoga membantu!'],
  ['Impor gagal', 'Halo, terima kasih laporannya. Impor CV paling stabil dengan file PDF berbasis teks (bukan hasil scan/foto) atau DOCX, maksimal 2 MB. Coba unggah ulang dengan file tersebut. Kredit untuk percobaan yang gagal otomatis dikembalikan.'],
  ['Hapus akun', 'Halo, permintaan penghapusan akun sudah kami terima. Kamu juga bisa menghapus akun sendiri lewat Profil > Hapus akun di aplikasi. Setelah dihapus, data akun dan CV di server ikut terhapus dan tidak bisa dipulihkan.'],
];

export async function supportPage(ctx, ticketId) {
  const list = await rpc('admin_tickets', { p_status: state.tab });
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, [['baru', 'Baru'], ['diproses', 'Diproses'], ['selesai', 'Selesai']].map(([k, l]) =>
    h('button', { type: 'button', role: 'tab', 'aria-selected': String(state.tab === k), class: `tab${state.tab === k ? ' active' : ''}`, onclick: () => { state.tab = k; supportPage(ctx, ticketId); } },
      `${l} · ${num(list.counts[k] || 0)}`)));

  const listEl = h('div', { class: 'tlist' }, tabs, list.rows.length ? list.rows.map((t) => h('a', {
    class: `titem${t.id === ticketId ? ' active' : ''}`, href: `#/bantuan/${t.id}`,
  }, avatar(t.name), h('div', { class: 'grow' },
    h('div', { class: 'titem-top' }, h('strong', null, t.name || 'Pengguna'), h('span', { class: 'muted small' }, ago(t.updated_at))),
    h('span', { class: 'titem-sub' }, t.subject),
    h('span', { class: 'titem-meta' }, icon(t.source === 'email' ? 'mail' : 'phone', 14), badge(TICKET_LABEL[t.status], TICKET_TONE[t.status])))))
    : h('div', { class: 'tlist-empty' }, empty(`Tidak ada tiket ${TICKET_LABEL[state.tab].toLowerCase()}.`)));

  const conv = h('section', { class: 'conv' });
  const side = h('div', { class: 'ctx' });
  mount(ctx.view, 
    pageHead('Bantuan pengguna', 'Laporan dari tombol "Laporkan masalah" di app. Email ke halo@potensiku.work tetap masuk ke Gmail.'),
    h('div', { class: 'support' }, listEl, conv, side));

  if (!ticketId) {
    conv.append(empty('Pilih tiket di sebelah kiri.', 'Balasanmu disimpan di tiket lalu dibuka di Gmail untuk dikirim ke pengguna.'));
    return;
  }
  const d = await rpc('admin_ticket', { p_id: ticketId });
  const t = d.ticket;
  const u = d.user;

  const msgs = h('div', { class: 'msgs' }, d.messages.map((m) => h('div', { class: `msg msg-${m.author}` },
    h('span', { class: 'msg-meta' }, `${m.author === 'admin' ? 'Admin' : m.author === 'system' ? 'Sistem' : (u?.name || 'Pengguna')} · ${dateTime(m.created_at)}`),
    h('p', null, m.body))));

  const text = h('textarea', { class: 'input reply', rows: '4', maxlength: '5000', placeholder: 'Tulis balasan…', 'aria-label': 'Balasan' });
  let status = 'selesai';
  const statusSel = select([['selesai', 'Status setelah kirim: Selesai'], ['diproses', 'Status setelah kirim: Diproses'], ['baru', 'Status setelah kirim: Baru']], status, (v) => { status = v; }, 'Status tiket');
  const send = async (viaGmail) => {
    const body = text.value.trim();
    if (viaGmail && body.length < 2) { toast('Tulis balasannya dulu.', 'warn'); return; }
    const res = await rpc('admin_reply_ticket', { p_id: t.id, p_body: body || null, p_status: status });
    if (viaGmail && res?.email) {
      const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(res.email)}&su=${encodeURIComponent(`Re: ${res.subject} [${code(t.id)}]`)}&body=${encodeURIComponent(body)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    toast(viaGmail ? 'Balasan disimpan. Gmail dibuka untuk mengirim.' : 'Status tiket diperbarui.');
    supportPage(ctx, t.id);
  };

  conv.append(
    h('div', { class: 'conv-head' },
      h('div', { class: 'grow' }, h('h3', null, `${code(t.id)} · ${t.subject}`),
        h('span', { class: 'muted small' }, `Dibuka ${dateTime(t.created_at)} · dari ${t.source === 'email' ? 'email' : 'app'}${t.app_version ? ` (${t.app_version})` : ''}${t.client ? ` · ${t.client}` : ''}`)),
      badge(TICKET_LABEL[t.status], TICKET_TONE[t.status])),
    msgs,
    h('div', { class: 'composer' },
      h('div', { class: 'templates' }, TEMPLATES.map(([label, body]) => h('button', { type: 'button', class: 'chip', onclick: () => { text.value = body; text.focus(); } }, `Template: ${label}`))),
      text,
      h('div', { class: 'composer-actions' }, statusSel, h('span', { class: 'grow' }),
        button('Ubah status saja', { onclick: () => send(false) }),
        button('Simpan & kirim via Gmail', { icon: 'send', kind: 'primary', onclick: () => send(true) }))));
  msgs.scrollTop = msgs.scrollHeight;

  if (u) {
    const addBonus = async () => {
      const amount = h('input', { class: 'input', type: 'number', min: '1', max: '500', value: '10', 'aria-label': 'Jumlah kredit' });
      const ok = await modal({
        title: `Kredit bonus untuk ${u.name}`,
        body: h('label', { class: 'form' }, 'Jumlah kredit (1–500)', amount),
        confirmLabel: 'Tambah kredit',
        onConfirm: () => rpc('admin_add_credits', { p_user: u.id, p_amount: Number(amount.value), p_note: `Tiket ${code(t.id)}` }),
      });
      if (ok != null) toast(`Kredit ditambahkan. Saldo top-up ${num(ok)}.`);
    };
    const resetTrial = async () => {
      const ok = await modal({
        title: 'Reset trial?', body: h('p', null, `${u.name} mendapat trial baru 12 kredit mulai hari ini.`), confirmLabel: 'Reset trial',
        onConfirm: () => rpc('admin_reset_trial', { p_user: u.id }),
      });
      if (ok != null) toast('Trial direset.');
    };
    side.append(
      card('Pengguna', {},
        h('div', { class: 'who' }, avatar(u.name, 40), h('div', null, h('strong', null, u.name), h('span', null, u.email))),
        kv('Paket', badge(u.plan, PLAN_TONE[u.plan] || 'gray')),
        kv('Kredit terpakai', num(u.credits_used)), kv('Saldo top-up', num(u.topup)),
        kv('Kota', u.city || '—'), kv('Bergabung', date(u.joined)),
        h('a', { class: 'more-link', href: `#/pengguna/${u.id}` }, 'Buka profil lengkap', icon('arrow', 16))),
      card('Tindakan cepat', {},
        button('Tambah kredit bonus', { icon: 'plus', onclick: addBonus }),
        button('Reset trial', { icon: 'reset', onclick: resetTrial }),
        h('p', { class: 'muted small' }, 'Setiap tindakan tercatat di log audit.')));
  } else {
    side.append(card('Pengguna', {}, empty('Akun pengguna sudah tidak ada.', t.email || '')));
  }
}

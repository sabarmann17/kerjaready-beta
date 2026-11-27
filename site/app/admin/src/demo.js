// Data demo FIKTIF untuk uji tampilan lokal (build --demo saja).
// Tidak pernah dibundel ke build produksi (lihat build.mjs).

const now = Date.now();
const iso = (msAgo) => new Date(now - msAgo).toISOString();
const H = 3600e3;
const D = 24 * H;

const users = [
  ['u1', 'Rina Pratiwi', 'rina.pratiwi@contoh.id', 'Bandung', 'Hemat', 'Aktif', 42, 0, 2 * H, 1 * D],
  ['u2', 'Dimas Saputra', 'dimas.s@contoh.id', 'Jakarta', 'Trial', 'Aktif', 12, 0, 5 * H, 2 * D],
  ['u3', 'Sari Wulandari', 'sari.w@contoh.id', 'Surabaya', 'Super', 'Aktif', 118, 0, 1 * D, 3 * D],
  ['u4', 'Yoga Pratama', 'yoga.p@contoh.id', 'Depok', 'Trial selesai', 'Nonaktif', 3, 0, 3 * D, 4 * D],
  ['u5', 'Ayu Lestari', 'ayu.lestari@contoh.id', 'Bogor', 'Ekstra', 'Aktif', 402, 20, 1 * D, 6 * D],
  ['u6', 'Fajar Nugroho', 'fajar.n@contoh.id', null, 'Belum klaim', 'Belum aktif', 0, 0, 6 * D, 7 * D],
].map(([id, name, email, city, plan, status, credits_used, topup, la, j]) => ({
  id, name, email, city, plan, status, credits_used, topup, last_active: iso(la), joined: iso(j), target_role: 'Staf Administrasi', suspended: status === 'Nonaktif',
}));

const tickets = [
  { id: 52, name: 'Dimas Saputra', subject: 'Kredit AI tidak bertambah setelah trial', status: 'baru', source: 'app', updated_at: iso(0.2 * H), user: 'u2' },
  { id: 51, name: 'Sari Wulandari', subject: 'Impor PDF gagal terbaca', status: 'baru', source: 'app', updated_at: iso(1 * H), user: 'u3' },
  { id: 50, name: 'Yoga Pratama', subject: 'Minta hapus akun dan data', status: 'diproses', source: 'app', updated_at: iso(3 * H), user: 'u4' },
];

const content = { items: { 'hero.title': { draft: 'Kenali potensimu. Rancang langkah kariermu.', published: 'Kenali potensimu. Tentukan langkah kariermu.' } }, last_publish: { version: 3, published_at: iso(5 * H), published_by: 'admin@contoh.id' }, versions: [{ version: 3, published_at: iso(5 * H), published_by: 'admin@contoh.id' }, { version: 2, published_at: iso(2 * D), published_by: 'admin@contoh.id' }] };

const audit = [
  ['terbitkan_landing', 'Landing v3', 'ok', 5 * H],
  ['tambah_kredit', 'Dimas Saputra', 'ok', 6 * H],
  ['balas_tiket', 'Dimas Saputra', 'ok', 6.1 * H],
  ['masuk_ditolak', 'orang@contoh.id', 'denied', 9 * H],
  ['masuk_admin', null, 'ok', 10 * H],
].map(([action, target_label, outcome, t]) => ({ action, target_label, outcome, created_at: iso(t), actor_email: outcome === 'denied' ? 'orang@contoh.id' : 'admin@contoh.id', ip: '103.10.20.12', detail: action === 'tambah_kredit' ? { jumlah: 10 } : {} }));

export async function demoRpc(fn, args) {
  await new Promise((r) => setTimeout(r, 120));
  switch (fn) {
    case 'admin_overview': {
      const days = args.p_days || 30;
      return {
        days, total_users: 1248, new_7d: 86, new_period: 310, new_prev_period: 262, active_7d: 412,
        credits_period: 18430, ai_requests_period: 7210, revenue_month: 0, revenue_prev_month: 0,
        signups: Array.from({ length: days }, (_, i) => ({ day: new Date(now - (days - 1 - i) * D).toISOString().slice(0, 10), count: Math.round(8 + i * 0.5 + (i % 5) * 2) })),
        plans: [{ plan: 'Trial', count: 1102 }, { plan: 'Beta', count: 4 }, { plan: 'Trial selesai', count: 120 }, { plan: 'Belum klaim', count: 22 }],
        cities: [{ city: 'Jakarta', count: 312 }, { city: 'Bandung', count: 184 }, { city: 'Surabaya', count: 131 }, { city: 'Depok', count: 96 }, { city: 'Bogor', count: 88 }],
        open_tickets: 3, new_tickets: 2, tickets,
      };
    }
    case 'admin_users': {
      const q = (args.p_search || '').toLowerCase();
      const rows = users.filter((u) => (!q || u.name.toLowerCase().includes(q) || u.email.includes(q)) && (!args.p_plan || u.plan === args.p_plan) && (!args.p_status || u.status === args.p_status) && (!args.p_city || u.city === args.p_city));
      return { total: rows.length, rows, cities: ['Bandung', 'Bogor', 'Depok', 'Jakarta', 'Surabaya'], plans: ['Belum klaim', 'Ekstra', 'Hemat', 'Super', 'Trial', 'Trial selesai'] };
    }
    case 'admin_user_detail': {
      const u = users.find((x) => x.id === args.p_user) || users[0];
      return {
        user: u, beta: false, suspend_reason: u.suspended ? 'Spam' : null, last_client: 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0',
        entitlement: { status: 'subscribed', plan: 'hemat', used: 42, limit: 100, period: 'month', topup_balance: u.topup, resets_at: new Date(now + 4 * D).toISOString() },
        stats: { analyses_30d: 14, cvs: 3, recs_applied: 21, exports: 5 },
        usage: [['analyze_job', 1, 0.5 * H], ['polish', 1, 1 * H], ['refund', -1, 20 * H], ['import_cv', 2, 21 * H]].map(([feature, cost, t]) => ({ feature, cost, created_at: iso(t) })),
        invoices: [], tickets: tickets.filter((t) => t.user === u.id),
      };
    }
    case 'admin_tickets':
      return { counts: { baru: 2, diproses: 1, selesai: 0 }, rows: tickets.filter((t) => !args.p_status || t.status === args.p_status) };
    case 'admin_ticket': {
      const t = tickets.find((x) => x.id === args.p_id) || tickets[0];
      const u = users.find((x) => x.id === t.user);
      return {
        ticket: { ...t, created_at: t.updated_at, app_version: '0.7.2', client: 'Chrome · Windows', email: u.email, user_id: u.id },
        messages: [{ author: 'user', body: 'Halo, trial 12 kredit saya sudah habis. Apakah ada cara menambah kredit sebelum paket dibuka?', created_at: t.updated_at }],
        user: u,
      };
    }
    case 'admin_invoices':
      return { month: new Date().toISOString().slice(0, 8) + '01', net: 0, paid: 0, problem: 0, active_subs: 0, total: 0, rows: [] };
    case 'admin_content': return content;
    case 'admin_content_save': return Object.keys(args.p_values || {}).length;
    case 'admin_content_publish': return 4;
    case 'admin_audit': return { denied_today: 1, rows: audit };
    case 'admin_sessions': return [{ id: 's1', user_agent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0', ip: '103.10.20.12', created_at: iso(1 * H), last_seen: iso(0.1 * H), aal: 'aal2', current: true }, { id: 's2', user_agent: 'Mozilla/5.0 (iPhone) Safari/604.1', ip: '103.10.20.40', created_at: iso(30 * H), last_seen: iso(2 * H), aal: 'aal2', current: false }];
    case 'admin_add_credits': return 10;
    case 'admin_reply_ticket': return { email: 'dimas.s@contoh.id', subject: 'Kredit AI tidak bertambah setelah trial' };
    default: return null;
  }
}

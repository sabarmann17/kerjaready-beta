import { rpc } from '../api.js';
import { h, icon, clear, mount, badge, empty, button, modal, toast } from '../dom.js';
import { num, dateTime, ago } from '../fmt.js';
import { pageHead, guard } from '../ui.js';
import SECTIONS from '../../cms-fields.json';

// Kata/klaim yang bertentangan dengan prinsip produk (PRD): tanpa jaminan
// diterima kerja, tanpa skor ATS tunggal.
const RISKY = /(jamin|garansi|pasti diterima|pasti lolos|lolos ats|skor ats|ats score|100\s?%)/i;

const state = { section: 'hero' };

export async function contentPage(ctx) {
  const d = await rpc('admin_content');
  const fields = SECTIONS.flatMap((s) => s.fields);
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
  const saved = {}; // draf yang tersimpan di server (atau bawaan)
  const live = {}; // versi yang sedang tayang
  for (const f of fields) {
    const it = d.items[f.key];
    saved[f.key] = it?.draft ?? f.default;
    live[f.key] = it?.published ?? f.default;
  }
  const values = { ...saved };
  const dirtyKeys = () => fields.filter((f) => values[f.key] !== saved[f.key]).map((f) => f.key);
  const pendingKeys = () => fields.filter((f) => values[f.key] !== live[f.key]).map((f) => f.key);

  guard.fn = () => !dirtyKeys().length || window.confirm('Ada perubahan yang belum disimpan. Tinggalkan halaman?');
  window.onbeforeunload = () => (dirtyKeys().length ? true : undefined);

  const statusBadge = h('span');
  const secList = h('nav', { class: 'sections', 'aria-label': 'Bagian halaman' });
  const editor = h('section', { class: 'card editor' });
  const preview = h('section', { class: 'card preview' });

  const refreshStatus = () => {
    const dirty = dirtyKeys().length;
    const pending = pendingKeys().length;
    mount(statusBadge, dirty ? badge(`${num(dirty)} belum disimpan`, 'amber')
      : pending ? badge(`Draf belum terbit · ${num(pending)} perubahan`, 'amber') : badge('Sama dengan yang tayang', 'green'));
    mount(secList, h('span', { class: 'sec-label' }, 'BAGIAN HALAMAN'),
      SECTIONS.map((s) => {
        const changed = s.fields.some((f) => values[f.key] !== live[f.key]);
        return h('button', { type: 'button', class: `sec${state.section === s.id ? ' active' : ''}`, onclick: () => { state.section = s.id; renderSection(); refreshStatus(); } },
          h('span', null, s.name), changed ? h('span', { class: 'dot', title: 'Ada perubahan belum terbit' }) : null);
      }));
  };

  const renderPreview = (sec) => {
    const v = (k) => values[k] ?? '';
    mount(preview, h('div', { class: 'card-head' }, h('h3', null, 'Pratinjau'), h('span', { class: 'muted small' }, 'perkiraan tampilan')));
    if (sec.id === 'seo') {
      preview.append(h('div', { class: 'serp' },
        h('span', { class: 'serp-url' }, 'potensiku.work'),
        h('span', { class: 'serp-title' }, v('seo.title')),
        h('span', { class: 'serp-desc' }, v('seo.description'))));
      return;
    }
    const browser = h('div', { class: 'browser' }, h('div', { class: 'browser-bar' }, h('i'), h('i'), h('i'), h('span', null, 'potensiku.work')));
    const page = h('div', { class: 'browser-page' });
    if (sec.id === 'hero') {
      page.append(
        h('span', { class: 'pv-eyebrow' }, v('hero.eyebrow')),
        h('h4', { class: 'pv-h1' }, v('hero.title')),
        h('p', { class: 'pv-p' }, v('hero.lede')),
        h('div', { class: 'pv-btns' }, h('span', { class: 'pv-btn' }, v('hero.cta1')), h('span', { class: 'pv-btn pv-ghost' }, v('hero.cta2'))));
    } else if (sec.id === 'faq') {
      page.append(h('h4', { class: 'pv-h2' }, v('faq.title')));
      for (const f of sec.fields.filter((x) => /\.q\d+$/.test(x.key))) {
        const a = f.key.replace('.q', '.a');
        page.append(h('details', { class: 'pv-faq', open: f === sec.fields[1] }, h('summary', null, v(f.key)), byKey[a] ? h('p', null, v(a)) : h('p', { class: 'muted' }, '(jawaban berisi tautan, ubah lewat kode)')));
      }
    } else {
      for (const f of sec.fields) {
        page.append(f.key.endsWith('.title') ? h('h4', { class: 'pv-h2' }, v(f.key))
          : /\.(cta|btn)$/.test(f.key) ? h('span', { class: 'pv-btn' }, v(f.key))
            : h('p', { class: 'pv-p' }, v(f.key)));
      }
    }
    browser.append(page);
    preview.append(browser, h('p', { class: 'muted small' }, 'Setelah diterbitkan, landing memakai teks baru dalam hitungan detik. Versi lama tersimpan di Riwayat.'));
  };

  const renderSection = () => {
    const sec = SECTIONS.find((s) => s.id === state.section) || SECTIONS[0];
    const changes = sec.fields.filter((f) => values[f.key] !== live[f.key]).length;
    mount(editor, h('div', { class: 'card-head' }, h('h3', null, sec.name), changes ? h('span', { class: 'tone-amber small strong' }, `${changes} perubahan`) : null));
    for (const f of sec.fields) {
      const counter = h('span', { class: 'counter' });
      const warn = h('p', { class: 'field-warn', role: 'alert' });
      const reset = h('button', { type: 'button', class: 'link small' }, 'Kembalikan bawaan');
      const attrs = { class: 'input', maxlength: String(f.max), id: `f-${f.key}` };
      const input = f.multiline ? h('textarea', { ...attrs, rows: f.max > 200 ? '4' : '2' }) : h('input', { ...attrs, type: 'text' });
      input.value = values[f.key];
      const sync = () => {
        counter.textContent = `${input.value.length}/${f.max}`;
        warn.textContent = RISKY.test(input.value) ? 'Hindari klaim jaminan diterima kerja atau skor/lolos ATS (prinsip produk).' : '';
        reset.hidden = input.value === f.default;
        input.classList.toggle('changed', input.value !== live[f.key]);
      };
      input.addEventListener('input', () => { values[f.key] = input.value; sync(); refreshStatus(); renderPreview(sec); });
      reset.addEventListener('click', () => { input.value = f.default; input.dispatchEvent(new Event('input')); });
      sync();
      editor.append(h('div', { class: 'field' },
        h('div', { class: 'field-top' }, h('label', { for: `f-${f.key}` }, f.label), counter),
        input, h('div', { class: 'field-foot' }, warn, reset)));
    }
    editor.append(h('div', { class: 'note' }, icon('shield', 16), h('span', null, 'Teks disimpan sebagai teks biasa (tanpa HTML atau script).')));
    renderPreview(sec);
  };

  const save = async (quiet) => {
    const keys = dirtyKeys();
    const empties = keys.filter((k) => !values[k].trim());
    if (empties.length) throw new Error(`Isian "${byKey[empties[0]].label}" tidak boleh kosong.`);
    if (!keys.length) return 0;
    await rpc('admin_content_save', { p_values: Object.fromEntries(keys.map((k) => [k, values[k]])) });
    keys.forEach((k) => { saved[k] = values[k]; });
    if (!quiet) toast(`${num(keys.length)} isian disimpan sebagai draf.`);
    refreshStatus();
    return keys.length;
  };

  const publish = async () => {
    const pending = pendingKeys();
    if (!pending.length) { toast('Tidak ada perubahan untuk diterbitkan.', 'warn'); return; }
    const risky = pending.filter((k) => RISKY.test(values[k]));
    const ok = await modal({
      title: 'Terbitkan ke landing page?',
      body: h('div', { class: 'form' },
        h('p', null, `${num(pending.length)} isian akan tayang di potensiku.work.`),
        h('ul', { class: 'change-list' }, pending.slice(0, 8).map((k) => h('li', null, `${SECTIONS.find((s) => s.fields.some((f) => f.key === k)).name} — ${byKey[k].label}`))),
        risky.length ? h('p', { class: 'field-warn' }, 'Ada teks yang memuat klaim jaminan/ATS. Pastikan sesuai prinsip produk.') : null),
      confirmLabel: 'Terbitkan',
      onConfirm: async () => { await save(true); return rpc('admin_content_publish'); },
    });
    if (ok != null) {
      pending.forEach((k) => { live[k] = values[k]; });
      toast(`Terbit sebagai versi ${ok}.`);
      contentPage(ctx);
    }
  };

  const history = async () => {
    const rows = d.versions.length ? d.versions.map((v) => h('div', { class: 'list-row' },
      h('div', { class: 'grow' }, h('strong', null, `Versi ${v.version}`), h('span', null, `${dateTime(v.published_at)} · ${v.published_by || '—'}`)),
      button('Pulihkan ke draf', {
        small: true,
        onclick: async () => {
          await rpc('admin_content_restore', { p_version: v.version });
          document.querySelector('.overlay')?.remove();
          toast(`Versi ${v.version} dipulihkan sebagai draf. Tinjau lalu terbitkan.`);
          contentPage(ctx);
        },
      }))) : [empty('Belum ada riwayat terbit.')];
    await modal({ title: 'Riwayat terbit', body: h('div', { class: 'history' }, rows), confirmLabel: 'Tutup' });
  };

  const last = d.last_publish;
  mount(ctx.view, 
    pageHead('Konten landing', last ? `Terakhir terbit ${ago(last.published_at)} (versi ${last.version}) oleh ${last.published_by || 'admin'}` : 'Belum pernah diterbitkan dari Admin Console', {
      right: [statusBadge,
        button('Riwayat', { icon: 'hist', onclick: history }),
        button('Simpan draf', { icon: 'save', onclick: async () => { try { await save(false); } catch (e) { toast(e.message, 'err'); } } }),
        button('Terbitkan', { icon: 'globe', kind: 'primary', onclick: async () => { try { await publish(); } catch (e) { toast(e.message, 'err'); } } })],
    }),
    h('div', { class: 'cms' }, secList, editor, preview));
  renderSection();
  refreshStatus();
}

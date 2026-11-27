// Build Admin Console -> web/admin/dist (dideploy ke admin.potensiku.work).
//   node build.mjs          build produksi
//   node build.mjs --demo   build uji lokal dengan data fiktif (tanpa server)
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const demo = process.argv.includes('--demo');
const out = join(here, demo ? 'dist-demo' : 'dist');
const cfg = JSON.parse(readFileSync(join(repo, '.github', 'web-build.json'), 'utf8'));
const ADMIN_EMAIL = 'aazwl17@gmail.com';

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'brand'), { recursive: true });

const noDemo = {
  name: 'no-demo',
  setup(b) {
    b.onResolve({ filter: /\.\/demo\.js$/ }, (args) => ({ path: join(args.resolveDir, 'demo-off.js') }));
  },
};

const res = await build({
  entryPoints: [join(here, 'src', 'main.js')],
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2020'],
  outfile: join(out, 'app.js'),
  legalComments: 'none',
  metafile: true,
  plugins: demo ? [] : [noDemo],
  define: {
    __DEMO__: String(demo),
    __SUPABASE_URL__: JSON.stringify(cfg.SUPABASE_URL),
    __SUPABASE_KEY__: JSON.stringify(cfg.SUPABASE_PUBLISHABLE_KEY),
    __GOOGLE_CLIENT_ID__: JSON.stringify(cfg.GOOGLE_WEB_CLIENT_ID),
    __ADMIN_EMAIL_SHA256__: JSON.stringify(createHash('sha256').update(ADMIN_EMAIL).digest('hex')),
  },
});

const js = readFileSync(join(out, 'app.js'));
const version = createHash('sha256').update(js).update(readFileSync(join(here, 'app.css'))).digest('hex').slice(0, 10);
writeFileSync(join(out, 'index.html'), readFileSync(join(here, 'index.html'), 'utf8').replaceAll('__VERSION__', version));
cpSync(join(here, 'app.css'), join(out, 'app.css'));
for (const f of ['wordmark_blue.png', 'wordmark_white.png']) {
  cpSync(join(repo, 'assets', 'brand', f), join(out, 'brand', f));
}
cpSync(join(repo, 'web', 'favicon.png'), join(out, 'brand', 'favicon.png'));
writeFileSync(join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

const kb = (Object.values(res.metafile.outputs)[0].bytes / 1024).toFixed(0);
console.log(`${demo ? 'DEMO' : 'PROD'} build ${version} -> ${out} (app.js ${kb} KB)`);

// Routing middleware Vercel: berjalan sebelum file statis, jadi semua
// permintaan ke admin.potensiku.work diarahkan ke folder /admin/ (Admin
// Console). Domain lain tidak tersentuh.
export const config = {
  matcher: [{ source: '/:path*', has: [{ type: 'host', value: 'admin.potensiku.work' }] }],
};

export default function middleware(request) {
  const url = new URL(request.url);
  if (url.hostname !== 'admin.potensiku.work') return;
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  if (path.includes('..')) return new Response('Not found', { status: 404 });
  const dest = new URL(`/admin${path}${url.search}`, url);
  return new Response(null, { headers: { 'x-middleware-rewrite': dest.toString() } });
}

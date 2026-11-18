// Cloudflare Worker: отдаёт страницу персонажа из Оружейной лостарк.рф сайту «Мульти-крит Lost Ark».
// У Оружейной нет CORS-заголовков, поэтому браузер не может прочитать её напрямую; этот Worker
// запрашивает страницу на стороне сервера и добавляет заголовки CORS для разрешённых сайтов.
// Запрос: GET https://<worker>/?name=<ник>  →  HTML страницы персонажа (или JSON с ошибкой).

const ARMORY = 'https://xn--80aubmleh.xn--p1ai/Profile/Character/'; // лостарк.рф
// Сайты, которым можно читать ответ. Добавьте свой домен, если сайт переедет.
const ALLOWED_ORIGINS = ['https://xslowly343.github.io'];
const CACHE_SECONDS = 300; // одна и та же страница кешируется на 5 минут

function corsHeaders(origin, env) {
  const extra = (env && env.ALLOWED_ORIGINS ? String(env.ALLOWED_ORIGINS).split(',') : []).map(s => s.trim()).filter(Boolean);
  const allowed = [...ALLOWED_ORIGINS, ...extra];
  const ok = allowed.includes('*') || allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    'Access-Control-Allow-Origin': ok ? (allowed.includes('*') ? '*' : origin) : allowed[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
const json = (obj, status, headers) => new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request.headers.get('Origin') || '', env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, cors);

    const name = (new URL(request.url).searchParams.get('name') || '').trim();
    if (!/^[\p{L}\p{N}_-]{2,24}$/u.test(name)) return json({ error: 'bad_name' }, 400, cors);

    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const key = new Request('https://armory-cache.invalid/' + encodeURIComponent(name.toLowerCase()));
    if (cache) {
      const hit = await cache.match(key);
      if (hit) return new Response(hit.body, { status: 200, headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8', 'X-Cache': 'HIT' } });
    }

    let upstream;
    try {
      upstream = await fetch(ARMORY + encodeURIComponent(name), {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ru-RU,ru;q=0.9',
        },
      });
    } catch (e) {
      return json({ error: 'upstream_unreachable' }, 502, cors);
    }
    if (!upstream.ok) return json({ error: 'upstream', status: upstream.status }, 502, cors);
    const html = await upstream.text();
    if (!html.includes('profile-character-info')) return json({ error: 'not_found' }, 404, cors);

    if (cache) ctx.waitUntil(cache.put(key, new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=' + CACHE_SECONDS } })));
    return new Response(html, { status: 200, headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8', 'X-Cache': 'MISS' } });
  },
};
